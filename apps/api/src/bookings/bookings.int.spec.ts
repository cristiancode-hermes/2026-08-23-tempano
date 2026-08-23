import { Test } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  ALL_ENTITIES,
  Booking,
  BookingLine,
  MenuItem,
  Rink,
  SessionSlot,
  SkateSize,
  User,
} from '../entities/entities';
import { BookingsService } from './bookings.service';
import { endTimeOf, parseMadridLocal, pointsForCompleted } from '../common/booking-rules';

describe('BookingsService transactional', () => {
  let svc: BookingsService;
  let users: Repository<User>;
  let rinks: Repository<Rink>;
  let slots: Repository<SessionSlot>;
  let sizes: Repository<SkateSize>;
  let bookings: Repository<Booking>;
  let lines: Repository<BookingLine>;
  let player: User;
  let other: User;
  let norte: Rink;
  let slot: SessionSlot;
  let size38: SkateSize;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: ALL_ENTITIES,
          synchronize: true,
        } as any),
        TypeOrmModule.forFeature(ALL_ENTITIES),
        JwtModule.register({ secret: 'test', signOptions: { expiresIn: '1h' } }),
      ],
      providers: [BookingsService],
    }).compile();
    svc = mod.get(BookingsService);
    users = mod.get(getRepositoryToken(User));
    rinks = mod.get(getRepositoryToken(Rink));
    slots = mod.get(getRepositoryToken(SessionSlot));
    sizes = mod.get(getRepositoryToken(SkateSize));
    bookings = mod.get(getRepositoryToken(Booking));
    lines = mod.get(getRepositoryToken(BookingLine));
    const menu = mod.get<Repository<MenuItem>>(getRepositoryToken(MenuItem));

    const hash = await bcrypt.hash('demo1234', 10);
    player = (await users.save({
      username: 'demo',
      email: 'demo@tempano.dev',
      passwordHash: hash,
      role: 'player',
      points: 0,
    } as any)) as User;
    other = (await users.save({
      username: 'nuria',
      email: 'nuria@tempano.dev',
      passwordHash: hash,
      role: 'player',
      points: 0,
    } as any)) as User;
    norte = (await rinks.save({
      slug: 'norte',
      name: 'Norte',
      mode: 'public',
      capacity: 10,
      priceCents: 900,
      description: 'test',
      photos: [],
      tags: [],
      active: true,
    } as any)) as Rink;
    slot = (await slots.save({
      rinkId: norte.id,
      date: '2026-08-23',
      startTime: '18:00',
      endTime: endTimeOf('18:00'),
      remainingSpots: 10,
      blocked: false,
      startsAt: parseMadridLocal('2026-08-23', '18:00'),
    } as any)) as SessionSlot;
    size38 = (await sizes.save({ sizeEu: 38, stockTotal: 4, stockReserved: 0 } as any)) as SkateSize;
    await menu.save({ slug: 'cacao', name: 'Cacao', kind: 'addon', priceCents: 350, active: true } as any);
  });

  it('hold decrements remainingSpots and reserves talla', async () => {
    const res = await svc.hold(player.id, {
      slotId: slot.id,
      partySize: 2,
      ownSkatesCount: 0,
      rentals: [{ sizeEu: 38, qty: 2 }],
    });
    expect(res.booking.status).toBe('pending');
    expect(res.totalCents).toBe(1800 + 700);
    const s = await slots.findOne({ where: { id: slot.id } });
    expect(s!.remainingSpots).toBe(8);
    const sz = await sizes.findOne({ where: { id: size38.id } });
    expect(sz!.stockReserved).toBe(2);
  });

  it('same user second hold on same slot → 409 ALREADY_HELD', async () => {
    await expect(
      svc.hold(player.id, {
        slotId: slot.id,
        partySize: 1,
        ownSkatesCount: 1,
        rentals: [],
      }),
    ).rejects.toMatchObject({ status: 409, response: { code: 'ALREADY_HELD' } });
  });

  it('SESSION_FULL when partySize > remaining', async () => {
    await expect(
      svc.hold(other.id, {
        slotId: slot.id,
        partySize: 9,
        ownSkatesCount: 9,
        rentals: [],
      }),
    ).rejects.toMatchObject({ status: 409, response: { code: 'SESSION_FULL' } });
  });

  it('SIZE_OUT_OF_STOCK when talla exceeds available', async () => {
    const fresh = (await slots.save({
      rinkId: norte.id,
      date: '2026-08-24',
      startTime: '10:00',
      endTime: '11:00',
      remainingSpots: 10,
      blocked: false,
      startsAt: parseMadridLocal('2026-08-24', '10:00'),
    } as any)) as SessionSlot;
    await expect(
      svc.hold(other.id, {
        slotId: fresh.id,
        partySize: 3,
        ownSkatesCount: 0,
        rentals: [{ sizeEu: 38, qty: 3 }],
      }),
    ).rejects.toMatchObject({ status: 409, response: { code: 'SIZE_OUT_OF_STOCK' } });
  });

  it('ownSkates does not reserve stock', async () => {
    const fresh = (await slots.save({
      rinkId: norte.id,
      date: '2026-08-24',
      startTime: '12:00',
      endTime: '13:00',
      remainingSpots: 10,
      blocked: false,
      startsAt: parseMadridLocal('2026-08-24', '12:00'),
    } as any)) as SessionSlot;
    const before = (await sizes.findOne({ where: { id: size38.id } }))!.stockReserved;
    await svc.hold(other.id, {
      slotId: fresh.id,
      partySize: 2,
      ownSkatesCount: 2,
      rentals: [],
    });
    const after = (await sizes.findOne({ where: { id: size38.id } }))!.stockReserved;
    expect(after).toBe(before);
    const s = await slots.findOne({ where: { id: fresh.id } });
    expect(s!.remainingSpots).toBe(8);
  });

  it('sweeper expires pending and restores plazas + tallas', async () => {
    const held = await bookings.findOne({ where: { userId: player.id, status: 'pending' } });
    expect(held).toBeTruthy();
    held!.expiresAt = new Date(Date.now() - 1000);
    await bookings.save(held!);
    const n = await svc.expireStale();
    expect(n).toBeGreaterThanOrEqual(1);
    const s = await slots.findOne({ where: { id: slot.id } });
    expect(s!.remainingSpots).toBe(10);
    const sz = await sizes.findOne({ where: { id: size38.id } });
    expect(sz!.stockReserved).toBe(0);
  });

  it('confirm emits code + qrSvg', async () => {
    const fresh = (await slots.save({
      rinkId: norte.id,
      date: '2026-08-25',
      startTime: '16:00',
      endTime: '17:00',
      remainingSpots: 10,
      blocked: false,
      startsAt: parseMadridLocal('2026-08-25', '16:00'),
    } as any)) as SessionSlot;
    const hold = await svc.hold(player.id, {
      slotId: fresh.id,
      partySize: 1,
      ownSkatesCount: 1,
      rentals: [],
    });
    const confirmed = await svc.confirm(player.id, hold.booking.id);
    expect(confirmed.code).toMatch(/^TP-/);
    expect(confirmed.qrSvg).toContain('<svg');
    expect(confirmed.status).toBe('confirmed');
  });

  it('second check-in → 409 ALREADY_CHECKED_IN', async () => {
    const b = await bookings.findOne({ where: { userId: player.id, status: 'confirmed' } });
    expect(b?.code).toBeTruthy();
    const first = await svc.checkIn(player.id, b!.code!);
    expect(first.booking.status).toBe('checked_in');
    await expect(svc.checkIn(player.id, b!.code!)).rejects.toMatchObject({
      status: 409,
      response: { code: 'ALREADY_CHECKED_IN' },
    });
  });

  it('lista ↔ detalle totals match SUM(lines)', async () => {
    const all = await bookings.find();
    for (const o of all) {
      const ls = await lines.find({ where: { bookingId: o.id } });
      if (!ls.length) continue;
      const sum = ls.reduce((a, l) => a + l.amountCents, 0);
      expect(sum).toBe(o.totalCents);
    }
  });

  it('complete awards 5 × partySize', async () => {
    const b = await bookings.findOne({ where: { status: 'checked_in' } });
    expect(b).toBeTruthy();
    const before = (await users.findOne({ where: { id: b!.userId } }))!.points;
    const res = await svc.complete(b!.id);
    expect(res.pointsAwarded).toBe(pointsForCompleted(b!.partySize));
    const after = (await users.findOne({ where: { id: b!.userId } }))!.points;
    expect(after).toBe(before + res.pointsAwarded);
  });
});

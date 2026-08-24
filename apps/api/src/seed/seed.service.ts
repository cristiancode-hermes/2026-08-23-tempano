import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  Booking,
  BookingLine,
  CheckIn,
  EmailLog,
  MenuItem,
  RentalHold,
  Review,
  Rink,
  SessionSlot,
  SkateSize,
  User,
} from '../entities/entities';
import {
  RENTAL_CENTS,
  SLOT_HOURS,
  addDaysYmd,
  buildSessionQrSvg,
  endTimeOf,
  madridDate,
  parseMadridLocal,
  pointsForCompleted,
  sessionTicketUrl,
} from '../common/booking-rules';

const ICE_PHOTOS = {
  norte: ['/assets/norte.jpg', '/assets/norte.jpg'],
  sur: ['/assets/sur.jpg', '/assets/sur.jpg'],
};

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly log = new Logger('Seed');

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Rink) private readonly rinks: Repository<Rink>,
    @InjectRepository(SessionSlot) private readonly slots: Repository<SessionSlot>,
    @InjectRepository(SkateSize) private readonly sizes: Repository<SkateSize>,
    @InjectRepository(MenuItem) private readonly menu: Repository<MenuItem>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(BookingLine) private readonly lines: Repository<BookingLine>,
    @InjectRepository(RentalHold) private readonly rentals: Repository<RentalHold>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(EmailLog) private readonly emails: Repository<EmailLog>,
    @InjectRepository(CheckIn) private readonly checkIns: Repository<CheckIn>,
  ) {}

  async onModuleInit() {
    if (process.env.SEED_DB === 'false') return;
    if ((await this.users.count()) > 0) return;
    await this.run();
  }

  async run() {
    const hash = await bcrypt.hash('demo1234', 10);
    const demo = (await this.users.save({
      username: 'demo',
      email: 'demo@tempano.dev',
      passwordHash: hash,
      role: 'player',
      points: 0,
    } as any)) as User;
    const staff = (await this.users.save({
      username: 'staff',
      email: 'staff@tempano.dev',
      passwordHash: hash,
      role: 'staff',
      points: 0,
    } as any)) as User;
    const other = (await this.users.save({
      username: 'nuria',
      email: 'nuria@tempano.dev',
      passwordHash: hash,
      role: 'player',
      points: 0,
    } as any)) as User;

    const norte = (await this.rinks.save({
      slug: 'norte',
      name: 'Pista Norte',
      mode: 'public',
      capacity: 40,
      priceCents: 900,
      description:
        'Sesión pública de 60 minutos. El hielo se comparte: caben varios grupos a la vez. Ideal para familias y primera vez.',
      photos: ICE_PHOTOS.norte,
      tags: ['familiar', 'público', 'iniciación'],
      active: true,
    } as any)) as Rink;
    const sur = (await this.rinks.save({
      slug: 'sur',
      name: 'Pista Sur',
      mode: 'private',
      capacity: 8,
      priceCents: 7200,
      description:
        'Hielo privado o escuela. Un solo grupo por franja. Precio por grupo, no por patinador.',
      photos: ICE_PHOTOS.sur,
      tags: ['privado', 'escuela', 'grupo'],
      active: true,
    } as any)) as Rink;

    const stockBySize: Record<number, number> = {
      28: 4, 29: 4, 30: 6, 31: 6, 32: 8, 33: 8, 34: 10, 35: 12, 36: 14,
      37: 14, 38: 16, 39: 14, 40: 12, 41: 10, 42: 8, 43: 6, 44: 4, 45: 3, 46: 2,
    };
    const sizeRows: SkateSize[] = [];
    for (let eu = 28; eu <= 46; eu++) {
      sizeRows.push(
        (await this.sizes.save({
          sizeEu: eu,
          stockTotal: stockBySize[eu] ?? 6,
          stockReserved: 0,
        } as any)) as SkateSize,
      );
    }

    for (const item of [
      { slug: 'casco', name: 'Casco', kind: 'addon', priceCents: 250 },
      { slug: 'guantes', name: 'Guantes térmicos', kind: 'addon', priceCents: 200 },
      { slug: 'cacao', name: 'Chocolate caliente', kind: 'addon', priceCents: 350 },
      { slug: 'pack-cumple', name: 'Pack cumpleaños', kind: 'pack', priceCents: 2800 },
    ]) {
      await this.menu.save({ ...item, active: true } as any);
    }

    const today = madridDate();
    for (let d = 0; d <= 14; d++) {
      const date = addDaysYmd(today, d);
      for (const rink of [norte, sur]) {
        for (const startTime of SLOT_HOURS()) {
          await this.slots.save({
            rinkId: rink.id,
            date,
            startTime,
            endTime: endTimeOf(startTime),
            remainingSpots: rink.mode === 'private' ? 1 : rink.capacity,
            blocked: false,
            startsAt: parseMadridLocal(date, startTime),
          } as any);
        }
      }
    }

    const slotPast = await this.slots.findOne({
      where: { rinkId: norte.id, date: addDaysYmd(today, -1), startTime: '18:00' },
    });
    // generate yesterday if missing
    let past = slotPast;
    if (!past) {
      past = (await this.slots.save({
        rinkId: norte.id,
        date: addDaysYmd(today, -1),
        startTime: '18:00',
        endTime: '19:00',
        remainingSpots: 37,
        blocked: false,
        startsAt: parseMadridLocal(addDaysYmd(today, -1), '18:00'),
      } as any)) as SessionSlot;
    } else {
      past.remainingSpots = 37;
      await this.slots.save(past);
    }

    const size38 = sizeRows.find((s) => s.sizeEu === 38)!;
    const completed = (await this.bookings.save({
      userId: demo.id,
      slotId: past.id,
      rinkId: norte.id,
      partySize: 3,
      ownSkatesCount: 1,
      status: 'completed',
      totalCents: 0,
      expiresAt: null,
      code: 'TP-SEED01',
      qrSvg: await buildSessionQrSvg(sessionTicketUrl('TP-SEED01'), 'TP-SEED01'),
      confirmedAt: new Date(Date.now() - 36 * 3600_000),
      completedAt: new Date(Date.now() - 30 * 3600_000),
    } as any)) as Booking;
    const completedLines = [
      { kind: 'base', label: 'Sesión Pista Norte × 3', qty: 3, unitCents: 900 },
      { kind: 'rental', label: 'Alquiler de patines', qty: 2, unitCents: RENTAL_CENTS },
      { kind: 'addon', label: 'Chocolate caliente', qty: 1, unitCents: 350 },
    ];
    let sum = 0;
    for (const l of completedLines) {
      const amount = l.qty * l.unitCents;
      sum += amount;
      await this.lines.save({ bookingId: completed.id, ...l, amountCents: amount, menuItemId: null } as any);
    }
    completed.totalCents = sum;
    await this.bookings.save(completed);
    demo.points = pointsForCompleted(3);
    await this.users.save(demo);

    await this.reviews.save({
      userId: demo.id,
      rinkId: norte.id,
      bookingId: completed.id,
      rating: 5,
      comment: 'Hielo liso y el cacao caliente al salir. Volveremos.',
    } as any);
    await this.checkIns.save({
      bookingId: completed.id,
      staffUserId: staff.id,
      code: 'TP-SEED01',
      scannedAt: new Date(Date.now() - 32 * 3600_000),
    } as any);
    await this.emails.save({
      userId: demo.id,
      bookingId: completed.id,
      toAddr: demo.email,
      subject: 'Témpano — ticket TP-SEED01',
      body: 'Ticket de sesión confirmada.',
    } as any);

    const liveSlot = await this.slots.findOne({
      where: { rinkId: norte.id, date: today, startTime: '19:00' },
    });
    if (liveSlot) {
      liveSlot.remainingSpots -= 2;
      await this.slots.save(liveSlot);
      const pending = (await this.bookings.save({
        userId: demo.id,
        slotId: liveSlot.id,
        rinkId: norte.id,
        partySize: 2,
        ownSkatesCount: 0,
        status: 'pending',
        totalCents: 1800 + RENTAL_CENTS * 2,
        expiresAt: new Date(Date.now() + 12 * 60 * 1000),
        code: null,
        qrSvg: null,
      } as any)) as Booking;
      await this.lines.save({
        bookingId: pending.id,
        kind: 'base',
        label: 'Sesión Pista Norte × 2',
        qty: 2,
        unitCents: 900,
        amountCents: 1800,
        menuItemId: null,
      } as any);
      await this.lines.save({
        bookingId: pending.id,
        kind: 'rental',
        label: 'Alquiler de patines',
        qty: 2,
        unitCents: RENTAL_CENTS,
        amountCents: RENTAL_CENTS * 2,
        menuItemId: null,
      } as any);
      size38.stockReserved += 2;
      await this.sizes.save(size38);
      await this.rentals.save({ bookingId: pending.id, skateSizeId: size38.id, qty: 2 } as any);
    }

    const expSlot = await this.slots.findOne({
      where: { rinkId: sur.id, date: today, startTime: '11:00' },
    });
    if (expSlot) {
      await this.bookings.save({
        userId: other.id,
        slotId: expSlot.id,
        rinkId: sur.id,
        partySize: 4,
        ownSkatesCount: 4,
        status: 'expired',
        totalCents: 7200,
        expiresAt: null,
        code: null,
        qrSvg: null,
      } as any);
    }

    this.log.log(`Seed OK — demo@tempano.dev / demo1234 (points=${demo.points}) staff@tempano.dev`);
  }
}

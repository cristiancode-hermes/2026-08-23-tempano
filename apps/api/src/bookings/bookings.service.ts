import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import {
  Booking,
  BookingLine,
  CheckIn,
  EmailLog,
  MenuItem,
  RentalHold,
  Rink,
  SessionSlot,
  SkateSize,
  User,
} from '../entities/entities';
import { Mutex } from '../common/mutex';
import {
  CANCEL_HOURS,
  HOLD_MINUTES,
  RENTAL_CENTS,
  buildQrPlaceholderSvg,
  canCancelByPolicy,
  canFitParty,
  canReserveSize,
  canTransition,
  holdConflict,
  hoursUntil,
  pointsForCompleted,
  spotsNeeded,
  sumLines,
  validatePartySize,
  validateSkateCoverage,
} from '../common/booking-rules';
import { HoldBookingDto, PatchBookingDto } from './bookings.dto';

function conflict(code: string, message: string, extra: Record<string, unknown> = {}) {
  return new HttpException({ statusCode: 409, code, message, ...extra }, HttpStatus.CONFLICT);
}

@Injectable()
export class BookingsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('BookingSweeper');
  private readonly mutex = new Mutex();
  private sweeper: ReturnType<typeof setInterval> | null = null;

  constructor(
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(BookingLine) private readonly lines: Repository<BookingLine>,
    @InjectRepository(SessionSlot) private readonly slots: Repository<SessionSlot>,
    @InjectRepository(Rink) private readonly rinks: Repository<Rink>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(MenuItem) private readonly menu: Repository<MenuItem>,
    @InjectRepository(EmailLog) private readonly emails: Repository<EmailLog>,
    @InjectRepository(SkateSize) private readonly sizes: Repository<SkateSize>,
    @InjectRepository(RentalHold) private readonly rentals: Repository<RentalHold>,
    @InjectRepository(CheckIn) private readonly checkIns: Repository<CheckIn>,
    private readonly dataSource: DataSource,
  ) {}

  onModuleInit() {
    this.sweeper = setInterval(() => {
      void this.expireStale().then((n) => {
        if (n > 0) this.logger.log(`${n} hold(s) vencido(s)`);
      });
    }, 30_000);
    this.sweeper.unref?.();
  }

  onModuleDestroy() {
    if (this.sweeper) clearInterval(this.sweeper);
  }

  async expireStale(): Promise<number> {
    const now = new Date();
    const pendings = await this.bookings.find({ where: { status: 'pending' } });
    let n = 0;
    for (const b of pendings) {
      if (b.expiresAt && new Date(b.expiresAt) < now) {
        await this.releaseHold(b);
        b.status = 'expired';
        b.expiresAt = null;
        b.updatedAt = new Date();
        await this.bookings.save(b);
        n += 1;
      }
    }
    return n;
  }

  private async releaseHold(b: Booking) {
    const slot = await this.slots.findOne({ where: { id: b.slotId } });
    const rink = slot ? await this.rinks.findOne({ where: { id: slot.rinkId } }) : null;
    if (slot && rink) {
      slot.remainingSpots += spotsNeeded(rink.mode, b.partySize);
      await this.slots.save(slot);
    }
    const holds = await this.rentals.find({ where: { bookingId: b.id } });
    for (const h of holds) {
      const size = await this.sizes.findOne({ where: { id: h.skateSizeId } });
      if (size) {
        size.stockReserved = Math.max(0, size.stockReserved - h.qty);
        await this.sizes.save(size);
      }
      await this.rentals.remove(h);
    }
  }

  async hold(userId: number, dto: HoldBookingDto) {
    if (!dto.slotId) throw new BadRequestException('slotId requerido');
    return this.mutex.run(async () => {
      await this.expireStale();
      const slot = await this.lockSlot(dto.slotId);
      if (!slot) throw new NotFoundException('Franja no encontrada');
      if (slot.blocked) throw conflict('SLOT_BLOCKED', 'La franja está bloqueada (zamboni).');

      const rink = await this.rinks.findOne({ where: { id: slot.rinkId, active: true } });
      if (!rink) throw new NotFoundException('Pista no disponible');

      const partyCheck = validatePartySize(dto.partySize, rink.capacity, rink.mode);
      if (!partyCheck.ok) throw new BadRequestException('partySize inválido');
      if (!canFitParty(slot.remainingSpots, rink.mode, dto.partySize)) {
        throw conflict(
          'SESSION_FULL',
          `No caben ${dto.partySize} plazas. Quedan ${slot.remainingSpots}.`,
        );
      }

      const existing = await this.bookings.find({ where: { slotId: slot.id } });
      if (holdConflict(existing, userId, slot.id) === 'ALREADY_HELD') {
        throw conflict('ALREADY_HELD', 'Ya tienes una reserva activa para esta franja.');
      }

      const own = dto.ownSkatesCount ?? 0;
      const rentalList = (dto.rentals || []).filter((r) => r.qty > 0);
      const rentalQty = rentalList.reduce((s, r) => s + r.qty, 0);
      const cover = validateSkateCoverage(dto.partySize, own, rentalQty);
      if (!cover.ok) {
        throw new BadRequestException('Las tallas + patines propios deben cubrir el grupo');
      }

      const reservedSizes = await this.reserveSizes(rentalList);

      slot.remainingSpots -= spotsNeeded(rink.mode, dto.partySize);
      await this.slots.save(slot);

      const lineDefs = await this.buildLines(rink, dto.partySize, rentalQty, dto.addonIds);
      const totalCents = sumLines(lineDefs);
      const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
      const now = new Date();

      const booking = (await this.bookings.save({
        userId,
        slotId: slot.id,
        rinkId: rink.id,
        partySize: dto.partySize,
        ownSkatesCount: own,
        status: 'pending',
        totalCents,
        expiresAt,
        code: null,
        qrSvg: null,
        createdAt: now,
        updatedAt: now,
      } as any)) as Booking;

      for (const ld of lineDefs) {
        await this.lines.save({
          bookingId: booking.id,
          kind: ld.kind,
          label: ld.label,
          qty: ld.qty,
          unitCents: ld.unitCents,
          amountCents: ld.qty * ld.unitCents,
          menuItemId: ld.menuItemId,
        } as any);
      }
      for (const rs of reservedSizes) {
        await this.rentals.save({
          bookingId: booking.id,
          skateSizeId: rs.id,
          qty: rs.qty,
        } as any);
      }

      const view = await this.loadView(booking.id);
      return {
        booking: view,
        expiresAt: expiresAt.toISOString(),
        lines: view.lines,
        rentals: view.rentals,
        totalCents,
      };
    });
  }

  async patchHold(userId: number, id: number, dto: PatchBookingDto) {
    return this.mutex.run(async () => {
      await this.expireStale();
      const b = await this.bookings.findOne({ where: { id } });
      if (!b) throw new NotFoundException('Reserva no encontrada');
      if (b.userId !== userId) throw new ForbiddenException('No es tu reserva');
      if (b.status !== 'pending') throw new ConflictException('Solo se edita un hold pendiente');
      if (b.expiresAt && new Date(b.expiresAt) < new Date()) {
        await this.releaseHold(b);
        b.status = 'expired';
        b.expiresAt = null;
        await this.bookings.save(b);
        throw conflict('HOLD_EXPIRED', 'La retención expiró.');
      }

      const slot = await this.lockSlot(b.slotId);
      const rink = await this.rinks.findOne({ where: { id: b.rinkId } });
      if (!slot || !rink) throw new NotFoundException('Pista no disponible');

      const partySize = dto.partySize ?? b.partySize;
      const own = dto.ownSkatesCount ?? b.ownSkatesCount;
      const rentalList = dto.rentals
        ? dto.rentals.filter((r) => r.qty > 0)
        : (await this.rentals.find({ where: { bookingId: id }, relations: { skateSize: true } })).map(
            (h) => ({ sizeEu: h.skateSize!.sizeEu, qty: h.qty }),
          );
      const rentalQty = rentalList.reduce((s, r) => s + r.qty, 0);
      const partyCheck = validatePartySize(partySize, rink.capacity, rink.mode);
      if (!partyCheck.ok) throw new BadRequestException('partySize inválido');
      const cover = validateSkateCoverage(partySize, own, rentalQty);
      if (!cover.ok) throw new BadRequestException('Cobertura de patines incompleta');

      slot.remainingSpots += spotsNeeded(rink.mode, b.partySize);
      const oldHolds = await this.rentals.find({ where: { bookingId: id } });
      for (const h of oldHolds) {
        const size = await this.sizes.findOne({ where: { id: h.skateSizeId } });
        if (size) {
          size.stockReserved = Math.max(0, size.stockReserved - h.qty);
          await this.sizes.save(size);
        }
      }
      await this.rentals.delete({ bookingId: id });
      await this.lines.delete({ bookingId: id });

      if (!canFitParty(slot.remainingSpots, rink.mode, partySize)) {
        slot.remainingSpots -= spotsNeeded(rink.mode, b.partySize);
        await this.slots.save(slot);
        throw conflict('SESSION_FULL', `No caben ${partySize} plazas.`);
      }
      const reservedSizes = await this.reserveSizes(rentalList);
      slot.remainingSpots -= spotsNeeded(rink.mode, partySize);
      await this.slots.save(slot);

      const lineDefs = await this.buildLines(rink, partySize, rentalQty, dto.addonIds);
      const totalCents = sumLines(lineDefs);
      for (const ld of lineDefs) {
        await this.lines.save({
          bookingId: id,
          kind: ld.kind,
          label: ld.label,
          qty: ld.qty,
          unitCents: ld.unitCents,
          amountCents: ld.qty * ld.unitCents,
          menuItemId: ld.menuItemId,
        } as any);
      }
      for (const rs of reservedSizes) {
        await this.rentals.save({ bookingId: id, skateSizeId: rs.id, qty: rs.qty } as any);
      }
      b.partySize = partySize;
      b.ownSkatesCount = own;
      b.totalCents = totalCents;
      b.updatedAt = new Date();
      await this.bookings.save(b);
      return this.loadView(id);
    });
  }

  async confirm(userId: number, id: number) {
    return this.mutex.run(async () => {
      await this.expireStale();
      const pre = await this.bookings.findOne({ where: { id } });
      if (!pre) throw new NotFoundException('Reserva no encontrada');
      if (pre.userId !== userId) throw new ForbiddenException('No es tu reserva');
      if (pre.status === 'confirmed') return this.loadView(id);
      if (pre.status !== 'pending') throw new ConflictException('No se puede confirmar');
      if (pre.expiresAt && new Date(pre.expiresAt) < new Date()) {
        await this.releaseHold(pre);
        pre.status = 'expired';
        pre.expiresAt = null;
        await this.bookings.save(pre);
        throw conflict('HOLD_EXPIRED', 'La retención expiró.');
      }
      if (!canTransition(pre.status, 'confirmed')) {
        throw new ConflictException('Transición inválida');
      }
      const code = this.makeCode();
      const qrSvg = buildQrPlaceholderSvg(code, code);
      pre.status = 'confirmed';
      pre.expiresAt = null;
      pre.code = code;
      pre.qrSvg = qrSvg;
      pre.confirmedAt = new Date();
      pre.updatedAt = new Date();
      await this.bookings.save(pre);

      const user = await this.users.findOne({ where: { id: userId } });
      if (user) {
        await this.emails.save({
          userId,
          bookingId: id,
          toAddr: user.email,
          subject: `Témpano — ticket ${code}`,
          body: `Tu sesión ${code} está confirmada. Enseña el QR en el torniquete.`,
        } as any);
      }
      return this.loadView(id);
    });
  }

  async cancel(userId: number, id: number, asStaff = false) {
    return this.mutex.run(async () => {
      const b = await this.bookings.findOne({ where: { id }, relations: { slot: true } });
      if (!b) throw new NotFoundException('Reserva no encontrada');
      if (!asStaff && b.userId !== userId) throw new ForbiddenException('No es tu reserva');
      if (b.status === 'cancelled' || b.status === 'expired' || b.status === 'completed') {
        throw new ConflictException('No se puede cancelar');
      }
      if (!asStaff && b.status !== 'pending') {
        const starts = b.slot?.startsAt;
        if (!starts || !canCancelByPolicy(hoursUntil(starts))) {
          throw new ConflictException(`Cancelación solo con ${CANCEL_HOURS}h de antelación`);
        }
      }
      await this.releaseHold(b);
      b.status = 'cancelled';
      b.expiresAt = null;
      b.cancelledAt = new Date();
      b.updatedAt = new Date();
      await this.bookings.save(b);
      return this.loadView(id);
    });
  }

  async complete(id: number) {
    return this.mutex.run(async () => {
      const b = await this.bookings.findOne({ where: { id } });
      if (!b) throw new NotFoundException('Reserva no encontrada');
      if (b.status !== 'checked_in' && b.status !== 'confirmed') {
        throw new ConflictException('Solo se completa una sesión check-in o confirmada');
      }
      if (b.status === 'confirmed') {
        // allow staff complete after missed scan
      }
      const points = pointsForCompleted(b.partySize);
      b.status = 'completed';
      b.completedAt = new Date();
      b.updatedAt = new Date();
      await this.bookings.save(b);
      const user = await this.users.findOne({ where: { id: b.userId } });
      if (user) {
        user.points += points;
        await this.users.save(user);
      }
      const view = await this.loadView(id);
      return { booking: view, pointsAwarded: points };
    });
  }

  async listMine(userId: number, status?: string) {
    const where: any = { userId };
    if (status) where.status = status;
    const items = await this.bookings.find({
      where,
      relations: { lines: true, slot: true, rink: true },
      order: { createdAt: 'DESC' },
    });
    return {
      items: items.map((b) => this.serialize(b)),
      total: items.length,
    };
  }

  async getOne(userId: number, id: number, asStaff = false) {
    const b = await this.bookings.findOne({
      where: { id },
      relations: { lines: true, slot: true, rink: true, rentals: { skateSize: true }, checkIn: true },
    });
    if (!b) throw new NotFoundException('Reserva no encontrada');
    if (!asStaff && b.userId !== userId) throw new ForbiddenException('No es tu reserva');
    return this.serialize(b);
  }

  async checkIn(staffUserId: number, code: string) {
    return this.mutex.run(async () => {
      const normalized = String(code || '').trim().toUpperCase();
      const b = await this.bookings.findOne({ where: { code: normalized } });
      if (!b) throw new NotFoundException('Código no encontrado');
      if (b.status === 'checked_in' || b.status === 'completed') {
        throw conflict('ALREADY_CHECKED_IN', 'Este ticket ya se usó.');
      }
      if (b.status !== 'confirmed') {
        throw new ConflictException('Solo se escanean tickets confirmados');
      }
      const existing = await this.checkIns.findOne({ where: { bookingId: b.id } });
      if (existing) throw conflict('ALREADY_CHECKED_IN', 'Este ticket ya se usó.');
      const row = (await this.checkIns.save({
        bookingId: b.id,
        staffUserId,
        code: normalized,
        scannedAt: new Date(),
      } as any)) as CheckIn;
      b.status = 'checked_in';
      b.updatedAt = new Date();
      await this.bookings.save(b);
      return { booking: await this.loadView(b.id), checkIn: row };
    });
  }

  async listCheckIns(date?: string) {
    const items = await this.checkIns.find({
      relations: { booking: true, staff: true },
      order: { scannedAt: 'DESC' },
    });
    if (!date) return { items };
    return { items: items.filter((c) => String(c.scannedAt).slice(0, 10) === date || true) };
  }

  private async lockSlot(id: number) {
    const supportsLock = this.dataSource.options.type !== 'better-sqlite3';
    const qb = this.slots.createQueryBuilder('s').where('s.id = :id', { id });
    return supportsLock ? qb.setLock('pessimistic_write').getOne() : qb.getOne();
  }

  private async reserveSizes(rentals: { sizeEu: number; qty: number }[]) {
    const out: { id: number; qty: number }[] = [];
    for (const r of rentals) {
      const size = await this.sizes.findOne({ where: { sizeEu: r.sizeEu } });
      if (!size) throw new NotFoundException(`Talla ${r.sizeEu} no existe`);
      if (!canReserveSize(size.stockTotal, size.stockReserved, r.qty)) {
        throw conflict('SIZE_OUT_OF_STOCK', `Talla ${r.sizeEu} agotada.`, { sizeEu: r.sizeEu });
      }
      size.stockReserved += r.qty;
      await this.sizes.save(size);
      out.push({ id: size.id, qty: r.qty });
    }
    return out;
  }

  private async buildLines(
    rink: Rink,
    partySize: number,
    rentalQty: number,
    addonIds?: number[],
  ) {
    const lines: {
      kind: 'base' | 'rental' | 'addon' | 'extra';
      label: string;
      qty: number;
      unitCents: number;
      menuItemId: number | null;
    }[] = [];
    if (rink.mode === 'public') {
      lines.push({
        kind: 'base',
        label: `Sesión ${rink.name} × ${partySize}`,
        qty: partySize,
        unitCents: rink.priceCents,
        menuItemId: null,
      });
    } else {
      lines.push({
        kind: 'base',
        label: `Hielo privado ${rink.name}`,
        qty: 1,
        unitCents: rink.priceCents,
        menuItemId: null,
      });
    }
    if (rentalQty > 0) {
      lines.push({
        kind: 'rental',
        label: 'Alquiler de patines',
        qty: rentalQty,
        unitCents: RENTAL_CENTS,
        menuItemId: null,
      });
    }
    if (addonIds?.length) {
      const items = await this.menu.find({ where: { id: In(addonIds), active: true } });
      for (const m of items) {
        lines.push({
          kind: m.kind === 'pack' ? 'extra' : 'addon',
          label: m.name,
          qty: 1,
          unitCents: m.priceCents,
          menuItemId: m.id,
        });
      }
    }
    return lines;
  }

  private makeCode() {
    return `TP-${randomBytes(3).toString('hex').toUpperCase().slice(0, 6)}`;
  }

  private async loadView(id: number) {
    const b = await this.bookings.findOne({
      where: { id },
      relations: { lines: true, slot: true, rink: true, rentals: { skateSize: true }, checkIn: true },
    });
    if (!b) throw new NotFoundException('Reserva no encontrada');
    return this.serialize(b);
  }

  serialize(b: Booking) {
    const lines = (b.lines || []).map((l) => ({
      id: l.id,
      kind: l.kind,
      label: l.label,
      qty: l.qty,
      unitCents: l.unitCents,
      amountCents: l.amountCents,
    }));
    const totalFromLines = lines.reduce((s, l) => s + l.amountCents, 0);
    return {
      id: b.id,
      userId: b.userId,
      slotId: b.slotId,
      rinkId: b.rinkId,
      partySize: b.partySize,
      ownSkatesCount: b.ownSkatesCount,
      status: b.status,
      totalCents: totalFromLines || b.totalCents,
      expiresAt: b.expiresAt ? new Date(b.expiresAt).toISOString() : null,
      code: b.code,
      qrSvg: b.qrSvg,
      confirmedAt: b.confirmedAt,
      createdAt: b.createdAt,
      slot: b.slot
        ? {
            id: b.slot.id,
            date: b.slot.date,
            startTime: b.slot.startTime,
            endTime: b.slot.endTime,
            remainingSpots: b.slot.remainingSpots,
            startsAt: b.slot.startsAt,
          }
        : null,
      rink: b.rink
        ? { id: b.rink.id, name: b.rink.name, slug: b.rink.slug, mode: b.rink.mode }
        : null,
      lines,
      rentals: (b.rentals || []).map((h) => ({
        sizeEu: h.skateSize?.sizeEu,
        qty: h.qty,
      })),
      checkIn: b.checkIn || null,
    };
  }
}

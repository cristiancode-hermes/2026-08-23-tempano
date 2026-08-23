import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rink, SessionSlot } from '../entities/entities';
import { endTimeOf, parseMadridLocal, SLOT_HOURS } from '../common/booking-rules';
import { BlockSlotDto, GenerateSlotsDto } from '../bookings/bookings.dto';

@Injectable()
export class SlotsService {
  constructor(
    @InjectRepository(SessionSlot) private readonly slots: Repository<SessionSlot>,
    @InjectRepository(Rink) private readonly rinks: Repository<Rink>,
  ) {}

  async forRink(rinkId: number, date: string) {
    const rink = await this.rinks.findOne({ where: { id: rinkId } });
    if (!rink) throw new NotFoundException('Pista no encontrada');
    const slots = await this.slots.find({
      where: { rinkId, date },
      order: { startTime: 'ASC' },
    });
    return {
      slots: slots.map((s) => this.toPublic(s, rink.capacity)),
    };
  }

  async getOne(id: number) {
    const slot = await this.slots.findOne({ where: { id }, relations: { rink: true } });
    if (!slot) throw new NotFoundException('Franja no encontrada');
    return { slot: this.toPublic(slot, slot.rink?.capacity || 0), rink: slot.rink };
  }

  async generate(rinkId: number, dto: GenerateSlotsDto) {
    const rink = await this.rinks.findOne({ where: { id: rinkId } });
    if (!rink) throw new NotFoundException('Pista no encontrada');
    const times = dto.times?.length ? dto.times : SLOT_HOURS();
    let created = 0;
    for (const startTime of times) {
      const exists = await this.slots.findOne({
        where: { rinkId, date: dto.date, startTime },
      });
      if (exists) continue;
      const remainingSpots = rink.mode === 'private' ? 1 : rink.capacity;
      await this.slots.save({
        rinkId,
        date: dto.date,
        startTime,
        endTime: endTimeOf(startTime),
        remainingSpots,
        blocked: false,
        startsAt: parseMadridLocal(dto.date, startTime),
      } as any);
      created += 1;
    }
    return { created };
  }

  async block(id: number, dto: BlockSlotDto) {
    const slot = await this.slots.findOne({ where: { id } });
    if (!slot) throw new NotFoundException('Franja no encontrada');
    slot.blocked = dto.blocked;
    await this.slots.save(slot);
    return { slot };
  }

  private toPublic(s: SessionSlot, capacity: number) {
    const full = s.blocked || s.remainingSpots <= 0;
    return {
      id: s.id,
      rinkId: s.rinkId,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      remainingSpots: s.remainingSpots,
      capacity,
      blocked: s.blocked,
      startsAt: s.startsAt,
      status: full ? 'completa' : 'libre',
    };
  }
}

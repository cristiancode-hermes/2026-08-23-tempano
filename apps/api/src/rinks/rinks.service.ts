import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite, Review, Rink, SessionSlot } from '../entities/entities';
import { madridDate } from '../common/booking-rules';
import { RinkDto } from '../bookings/bookings.dto';

@Injectable()
export class RinksService {
  constructor(
    @InjectRepository(Rink) private readonly rinks: Repository<Rink>,
    @InjectRepository(SessionSlot) private readonly slots: Repository<SessionSlot>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(Favorite) private readonly favorites: Repository<Favorite>,
  ) {}

  async list(q?: string, mode?: string, date?: string) {
    const day = date || madridDate();
    let items = await this.rinks.find({ where: { active: true }, order: { id: 'ASC' } });
    if (mode) items = items.filter((r) => r.mode === mode);
    if (q) {
      const n = q.toLowerCase();
      items = items.filter(
        (r) =>
          r.name.toLowerCase().includes(n) ||
          r.slug.includes(n) ||
          (r.tags || []).some((t) => t.toLowerCase().includes(n)),
      );
    }
    const decorated = [];
    let freeSlotsToday = 0;
    for (const r of items) {
      const stats = await this.freeFor(r.id, day);
      freeSlotsToday += stats.freeSlotsToday;
      decorated.push({ ...this.toPublic(r), ...stats });
    }
    return { items: decorated, total: decorated.length, freeSlotsToday };
  }

  async featured(date?: string) {
    const all = await this.list(undefined, undefined, date);
    return {
      items: all.items.slice(0, 2),
      freeSlotsToday: all.freeSlotsToday,
    };
  }

  async getOne(id: number) {
    const rink = await this.rinks.findOne({ where: { id } });
    if (!rink) throw new NotFoundException('Pista no encontrada');
    const day = madridDate();
    const stats = await this.freeFor(rink.id, day);
    const reviews = await this.reviews.find({ where: { rinkId: rink.id } });
    const ratingCount = reviews.length;
    const ratingAvg = ratingCount
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / ratingCount) * 10) / 10
      : 0;
    return { rink: { ...this.toPublic(rink), ...stats, ratingAvg, ratingCount }, ratingAvg, ratingCount };
  }

  async create(dto: RinkDto) {
    const rink = (await this.rinks.save({
      slug: dto.slug,
      name: dto.name,
      mode: dto.mode,
      capacity: dto.capacity,
      priceCents: dto.priceCents,
      description: dto.description || '',
      photos: dto.photos || [],
      tags: dto.tags || [],
      active: true,
    } as any)) as Rink;
    return { rink: this.toPublic(rink) };
  }

  async update(id: number, dto: Partial<RinkDto>) {
    const rink = await this.rinks.findOne({ where: { id } });
    if (!rink) throw new NotFoundException('Pista no encontrada');
    Object.assign(rink, dto);
    await this.rinks.save(rink);
    return { rink: this.toPublic(rink) };
  }

  async remove(id: number) {
    const rink = await this.rinks.findOne({ where: { id } });
    if (!rink) throw new NotFoundException('Pista no encontrada');
    rink.active = false;
    await this.rinks.save(rink);
    return { ok: true };
  }

  async toggleFavorite(userId: number, rinkId: number) {
    const existing = await this.favorites.findOne({ where: { userId, rinkId } });
    if (existing) {
      await this.favorites.remove(existing);
      return { favorite: null, on: false };
    }
    const favorite = (await this.favorites.save({ userId, rinkId } as any)) as Favorite;
    return { favorite, on: true };
  }

  private async freeFor(rinkId: number, date: string) {
    const slots = await this.slots.find({ where: { rinkId, date } });
    const freeSlotsToday = slots.filter((s) => !s.blocked && s.remainingSpots > 0).length;
    const remainingSpots = slots.reduce((s, sl) => s + (sl.blocked ? 0 : sl.remainingSpots), 0);
    return { freeSlotsToday, remainingSpots };
  }

  toPublic(r: Rink) {
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      mode: r.mode,
      capacity: r.capacity,
      priceCents: r.priceCents,
      description: r.description,
      photos: r.photos || [],
      tags: r.tags || [],
      active: r.active,
    };
  }
}

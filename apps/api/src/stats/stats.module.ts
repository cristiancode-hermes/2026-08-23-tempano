import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Booking, BookingLine } from '../entities/entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffGuard } from '../auth/current-user';
import { addDaysYmd, madridDate } from '../common/booking-rules';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';

@ApiTags('staff')
@Controller('staff')
export class StatsController {
  constructor(
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(BookingLine) private readonly lines: Repository<BookingLine>,
  ) {}

  @Get('stats')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  async stats(@Query('from') from?: string, @Query('to') to?: string) {
    const end = to || madridDate();
    const start = from || addDaysYmd(end, -6);
    const all = await this.bookings.find({ relations: { slot: true, lines: true } });
    const paid = all.filter((b) =>
      ['confirmed', 'checked_in', 'completed'].includes(b.status),
    );
    const series: { date: string; occupied: number; revenueCents: number }[] = [];
    let cursor = start;
    while (cursor <= end) {
      const dayBookings = paid.filter((b) => b.slot?.date === cursor);
      const occupied = dayBookings.reduce((s, b) => s + b.partySize, 0);
      const revenueCents = dayBookings.reduce((s, b) => {
        const sum = (b.lines || []).reduce((a, l) => a + l.amountCents, 0);
        return s + (sum || b.totalCents);
      }, 0);
      series.push({ date: cursor, occupied, revenueCents });
      cursor = addDaysYmd(cursor, 1);
    }
    const kpis = {
      sessions: paid.length,
      skaters: paid.reduce((s, b) => s + b.partySize, 0),
      revenueCents: series.reduce((s, d) => s + d.revenueCents, 0),
      pending: all.filter((b) => b.status === 'pending').length,
    };
    return { kpis, series };
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Booking, BookingLine]), AuthModule],
  controllers: [StatsController],
})
export class StatsModule {}

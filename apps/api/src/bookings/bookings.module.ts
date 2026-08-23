import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      BookingLine,
      SessionSlot,
      Rink,
      User,
      MenuItem,
      EmailLog,
      SkateSize,
      RentalHold,
      CheckIn,
    ]),
    AuthModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}

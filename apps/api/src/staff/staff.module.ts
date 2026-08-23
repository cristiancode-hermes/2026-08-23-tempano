import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BookingsService } from '../bookings/bookings.service';
import { CheckInDto } from '../bookings/bookings.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, StaffGuard } from '../auth/current-user';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BookingsModule } from '../bookings/bookings.module';

@ApiTags('staff')
@Controller('staff')
export class StaffController {
  constructor(private readonly bookings: BookingsService) {}

  @Post('check-in')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  checkIn(@CurrentUser() user: { userId: number }, @Body() dto: CheckInDto) {
    return this.bookings.checkIn(user.userId, dto.code);
  }

  @Get('check-ins')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  list(@Query('date') date?: string) {
    return this.bookings.listCheckIns(date);
  }
}

@Module({
  imports: [AuthModule, BookingsModule],
  controllers: [StaffController],
})
export class StaffModule {}

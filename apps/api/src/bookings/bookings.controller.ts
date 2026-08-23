import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { ConfirmBookingDto, HoldBookingDto, PatchBookingDto } from './bookings.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, StaffGuard } from '../auth/current-user';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post('hold')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  hold(@CurrentUser() user: { userId: number }, @Body() dto: HoldBookingDto) {
    return this.bookings.hold(user.userId, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  patch(
    @CurrentUser() user: { userId: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PatchBookingDto,
  ) {
    return this.bookings.patchHold(user.userId, id, dto);
  }

  @Post(':id/confirm')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  confirm(
    @CurrentUser() user: { userId: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() _dto: ConfirmBookingDto,
  ) {
    return this.bookings.confirm(user.userId, id);
  }

  @Post(':id/cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  cancel(@CurrentUser() user: { userId: number; role: string }, @Param('id', ParseIntPipe) id: number) {
    const staff = user.role === 'staff' || user.role === 'admin';
    return this.bookings.cancel(user.userId, id, staff);
  }

  @Post(':id/complete')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  complete(@Param('id', ParseIntPipe) id: number) {
    return this.bookings.complete(id);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: { userId: number }, @Query('status') status?: string) {
    return this.bookings.listMine(user.userId, status);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  one(@CurrentUser() user: { userId: number; role: string }, @Param('id', ParseIntPipe) id: number) {
    const staff = user.role === 'staff' || user.role === 'admin';
    return this.bookings.getOne(user.userId, id, staff);
  }
}

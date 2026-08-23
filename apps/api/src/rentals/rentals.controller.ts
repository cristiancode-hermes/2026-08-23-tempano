import { Body, Controller, Get, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RentalsService } from './rentals.service';
import { StockDto } from '../bookings/bookings.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffGuard } from '../auth/current-user';

@ApiTags('skate-sizes')
@Controller('skate-sizes')
export class RentalsController {
  constructor(private readonly rentals: RentalsService) {}

  @Get()
  list() {
    return this.rentals.list();
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: StockDto) {
    return this.rentals.updateStock(id, dto);
  }
}

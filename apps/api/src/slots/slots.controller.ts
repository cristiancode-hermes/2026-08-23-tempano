import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SlotsService } from './slots.service';
import { BlockSlotDto, GenerateSlotsDto } from '../bookings/bookings.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffGuard } from '../auth/current-user';

@ApiTags('slots')
@Controller()
export class SlotsController {
  constructor(private readonly slots: SlotsService) {}

  @Get('rinks/:rinkId/slots')
  list(@Param('rinkId', ParseIntPipe) rinkId: number, @Query('date') date: string) {
    return this.slots.forRink(rinkId, date);
  }

  @Get('slots/:id')
  one(@Param('id', ParseIntPipe) id: number) {
    return this.slots.getOne(id);
  }

  @Post('rinks/:rinkId/slots/generate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  generate(@Param('rinkId', ParseIntPipe) rinkId: number, @Body() dto: GenerateSlotsDto) {
    return this.slots.generate(rinkId, dto);
  }

  @Patch('slots/:id/block')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  block(@Param('id', ParseIntPipe) id: number, @Body() dto: BlockSlotDto) {
    return this.slots.block(id, dto);
  }
}

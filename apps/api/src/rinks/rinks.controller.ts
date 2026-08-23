import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RinksService } from './rinks.service';
import { FavoriteDto, RinkDto } from '../bookings/bookings.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, StaffGuard } from '../auth/current-user';

@ApiTags('rinks')
@Controller()
export class RinksController {
  constructor(private readonly rinks: RinksService) {}

  @Get('rinks')
  list(@Query('q') q?: string, @Query('mode') mode?: string, @Query('date') date?: string) {
    return this.rinks.list(q, mode, date);
  }

  @Get('rinks/featured')
  featured(@Query('date') date?: string) {
    return this.rinks.featured(date);
  }

  @Get('rinks/:id')
  one(@Param('id', ParseIntPipe) id: number) {
    return this.rinks.getOne(id);
  }

  @Post('rinks')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  create(@Body() dto: RinkDto) {
    return this.rinks.create(dto);
  }

  @Patch('rinks/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<RinkDto>) {
    return this.rinks.update(id, dto);
  }

  @Delete('rinks/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.rinks.remove(id);
  }

  @Post('favorites')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  fav(@CurrentUser() user: { userId: number }, @Body() dto: FavoriteDto) {
    return this.rinks.toggleFavorite(user.userId, dto.rinkId);
  }
}

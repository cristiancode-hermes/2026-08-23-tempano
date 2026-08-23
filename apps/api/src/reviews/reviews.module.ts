import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Booking, Review } from '../entities/entities';
import { ReviewDto } from '../bookings/bookings.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';

@ApiTags('reviews')
@Controller()
export class ReviewsController {
  constructor(
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
  ) {}

  @Get('rinks/:id/reviews')
  async list(@Param('id', ParseIntPipe) id: number) {
    const items = await this.reviews.find({
      where: { rinkId: id },
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
    const count = items.length;
    const avg = count ? Math.round((items.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
    return {
      items: items.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        username: r.user?.username,
        createdAt: r.createdAt,
      })),
      avg,
      count,
    };
  }

  @Post('rinks/:id/reviews')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser() user: { userId: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewDto,
  ) {
    if (dto.rating < 1 || dto.rating > 5) throw new BadRequestException('rating 1-5');
    const completed = await this.bookings.findOne({
      where: { userId: user.userId, rinkId: id, status: 'completed' },
    });
    if (!completed) throw new ForbiddenException('Solo tras completar una sesión');
    const existing = await this.reviews.findOne({ where: { bookingId: completed.id } });
    if (existing) throw new BadRequestException('Ya reseñaste esta sesión');
    const review = (await this.reviews.save({
      userId: user.userId,
      rinkId: id,
      bookingId: completed.id,
      rating: dto.rating,
      comment: dto.comment || '',
    } as any)) as Review;
    return { review };
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Review, Booking]), AuthModule],
  controllers: [ReviewsController],
})
export class ReviewsModule {}

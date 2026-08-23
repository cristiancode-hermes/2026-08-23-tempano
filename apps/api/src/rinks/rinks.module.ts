import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Favorite, Review, Rink, SessionSlot } from '../entities/entities';
import { RinksService } from './rinks.service';
import { RinksController } from './rinks.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Rink, SessionSlot, Review, Favorite]), AuthModule],
  controllers: [RinksController],
  providers: [RinksService],
  exports: [RinksService],
})
export class RinksModule {}

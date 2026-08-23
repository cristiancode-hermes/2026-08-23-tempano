import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuItem } from '../entities/entities';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Controller('menu')
export class MenuController {
  constructor(@InjectRepository(MenuItem) private readonly menu: Repository<MenuItem>) {}

  @Get()
  async list() {
    const items = await this.menu.find({ where: { active: true }, order: { id: 'ASC' } });
    return { items };
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([MenuItem])],
  controllers: [MenuController],
})
export class MenuModule {}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkateSize } from '../entities/entities';
import { availableStock } from '../common/booking-rules';
import { StockDto } from '../bookings/bookings.dto';

@Injectable()
export class RentalsService {
  constructor(@InjectRepository(SkateSize) private readonly sizes: Repository<SkateSize>) {}

  async list() {
    const rows = await this.sizes.find({ order: { sizeEu: 'ASC' } });
    return {
      items: rows.map((s) => ({
        id: s.id,
        sizeEu: s.sizeEu,
        stockTotal: s.stockTotal,
        stockReserved: s.stockReserved,
        available: availableStock(s.stockTotal, s.stockReserved),
      })),
    };
  }

  async updateStock(id: number, dto: StockDto) {
    const size = await this.sizes.findOne({ where: { id } });
    if (!size) throw new NotFoundException('Talla no encontrada');
    size.stockTotal = dto.stockTotal;
    await this.sizes.save(size);
    return {
      size: {
        id: size.id,
        sizeEu: size.sizeEu,
        stockTotal: size.stockTotal,
        stockReserved: size.stockReserved,
        available: availableStock(size.stockTotal, size.stockReserved),
      },
    };
  }
}

import { Controller, Get } from '@nestjs/common';
import { Module } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  ping() {
    return { ok: true, service: 'tempano' };
  }
}

@Module({
  controllers: [HealthController],
})
export class HealthModule {}

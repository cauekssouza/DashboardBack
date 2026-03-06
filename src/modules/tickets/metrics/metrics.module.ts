import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { PrismaService } from '../../../database/prisma.service';

@Module({
  controllers: [MetricsController],
  providers: [MetricsService, PrismaService],
  exports: [MetricsService],
})
export class MetricsModule {}
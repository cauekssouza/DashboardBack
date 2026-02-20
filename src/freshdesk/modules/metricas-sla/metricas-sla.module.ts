// src/freshdesk/modules/metricas-sla/metricas-sla.module.ts
import { Module } from '@nestjs/common';
import { MetricasSlaService } from './metricas-sla.service';

@Module({
  providers: [MetricasSlaService],
  exports: [MetricasSlaService]  // ✅ IMPORTANTE!
})
export class MetricasSlaModule {}
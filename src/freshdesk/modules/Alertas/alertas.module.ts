// src/freshdesk/modules/alertas/alertas.module.ts
import { Module } from '@nestjs/common';
import { AlertasService } from './alertas.service';

@Module({
  providers: [AlertasService],
  exports: [AlertasService]  // ✅ IMPORTANTE!
})
export class AlertasModule {}
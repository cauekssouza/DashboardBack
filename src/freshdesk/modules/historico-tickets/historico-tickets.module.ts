// src/freshdesk/modules/historico-tickets/historico-tickets.module.ts
import { Module } from '@nestjs/common';
import { HistoricoTicketsService } from './historico-tickets.service';

@Module({
  providers: [HistoricoTicketsService],
  exports: [HistoricoTicketsService]  // ✅ IMPORTANTE!
})
export class HistoricoTicketsModule {}
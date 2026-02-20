// src/freshdesk/modules/ticket-atual/ticket-atual.module.ts
import { Module } from '@nestjs/common';
import { TicketAtualService } from './ticket-atual.service';

@Module({
  providers: [TicketAtualService],
  exports: [TicketAtualService]  // ✅ IMPORTANTE!
})
export class TicketAtualModule {}
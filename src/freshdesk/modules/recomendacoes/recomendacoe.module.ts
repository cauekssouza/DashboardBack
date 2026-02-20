// src/freshdesk/modules/recomendacoes/recomendacoes.module.ts
import { Module } from '@nestjs/common';
import { RecomendacoesService } from './recomendacoes.service';

@Module({
  providers: [RecomendacoesService],
  exports: [RecomendacoesService]  // ✅ IMPORTANTE!
})
export class RecomendacoesModule {}
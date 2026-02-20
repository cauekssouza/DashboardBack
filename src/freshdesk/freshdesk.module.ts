// src/freshdesk/freshdesk.module.ts
import { Module } from '@nestjs/common';
import { FreshdeskService } from './freshdesk.service';
import { FreshdeskController } from './freshdesk.controller';

// Imports dos módulos (que agora exportam os services)
import { AlertasModule } from './modules/Alertas/alertas.module';
import { RecomendacoesModule } from './modules/recomendacoes/recomendacoe.module';
import { PerfilClienteModule } from './modules/perfil-cliente/perfil-cliente.module';
import { TicketAtualModule } from './modules/ticket-atual/ticket-atual.module';
import { MetricasSlaModule } from './modules/metricas-sla/metricas-sla.module';
import { HistoricoTicketsModule } from './modules/historico-tickets/historico-tickets.module';

@Module({
  imports: [
    AlertasModule,           // ✅ Agora exporta AlertasService
    RecomendacoesModule,     // ✅ Exporta RecomendacoesService
    PerfilClienteModule,     // ✅ Exporta PerfilClienteService
    TicketAtualModule,       // ✅ Exporta TicketAtualService
    MetricasSlaModule,       // ✅ Exporta MetricasSlaService
    HistoricoTicketsModule,  // ✅ Exporta HistoricoTicketsService
  ],
  controllers: [FreshdeskController],
  providers: [FreshdeskService],  // ✅ Só precisa do FreshdeskService aqui
  exports: [FreshdeskService]
})
export class FreshdeskModule {}
// src/freshdesk/modules/metricas-sla/metricas-sla.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricasSlaService {
  async calcularMetricasDashboard() {
    return {
      ticketsHoje: 15,
      ticketsAbertos: 23,
      ticketsEmAndamento: 8,
      ticketsResolvidosHoje: 12,
      tempoMedioResposta: 15,
      tempoMedioResolucao: 18.5,
      slaCumprido: 94.2,
      csatMedio: 4.7
    };
  }
}
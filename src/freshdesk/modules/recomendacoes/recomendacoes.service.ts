// src/freshdesk/modules/recomendacoes/recomendacoes.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class RecomendacoesService {
  async gerarRecomendacoesPorCliente(clienteId: string) {
    return {
      recomendacoes: [
        {
          id: '1',
          acaoSugerida: 'VERIFICAR_SLA',
          detalhes: 'Ticket com SLA próximo do vencimento',
          prioridadeSugerida: 4
        }
      ]
    };
  }
}
// src/freshdesk/modules/historico-tickets/historico-tickets.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class HistoricoTicketsService {
  async listarUltimosTickets(clienteId: string, quantidade: number) {
    return [
      {
        id: '1',
        numero: 12345,
        assunto: 'Primeiro ticket',
        criadoEm: new Date(),
        status: 'Resolved',
        prioridade: 'ALTA',
        tipo: 'Solicitação'
      },
      {
        id: '2',
        numero: 12346,
        assunto: 'Segundo ticket',
        criadoEm: new Date(Date.now() - 24 * 60 * 60 * 1000),
        status: 'Open',
        prioridade: 'MÉDIA',
        tipo: 'Dúvida'
      }
    ];
  }
}
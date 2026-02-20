// src/freshdesk/modules/ticket-atual/ticket-atual.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class TicketAtualService {
  async buscarTicketAtualDoCliente(clienteId: string) {
    return {
      id: 'ticket1',
      numero: 12345,
      assunto: 'Problema na integração',
      tipo: 'Solicitação',
      prioridade: 4,
      prioridadeLabel: 'URGENTE',
      status: 2,
      statusLabel: 'ABERTO',
      criadoEm: new Date(),
      prazoSLA: new Date(Date.now() + 2 * 60 * 60 * 1000),
      slaEmRisco: true,
      tempoRestanteSLA: 2.5,
      atendente: 'João Silva'
    };
  }
}
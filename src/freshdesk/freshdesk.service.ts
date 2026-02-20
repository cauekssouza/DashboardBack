// back/src/freshdesk/freshdesk.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class FreshdeskService {
  async getDashboard(clienteId: string) {
    return {
      message: 'Dashboard funcionando!',
      clienteId,
      timestamp: new Date().toISOString(),
      alertas: {
        flagUrgente: true,
        flagVIP: true,
        flagEspecializado: true,
        scoreRisco: 'ALTO',
        scoreRecorrencia: 'ALTA',
        classificacao: 'VIP'
      },
      perfil: {
        id: clienteId,
        nome: 'Cliente Exemplo',
        email: 'cliente@email.com',
        totalTickets: 10
      },
      ticketAtual: {
        id: '1',
        numero: 12345,
        assunto: 'Ticket de teste',
        tipo: 'Solicitação',
        prioridade: 4,
        prioridadeLabel: 'URGENTE',
        status: 2,
        statusLabel: 'ABERTO',
        criadoEm: new Date(),
        prazoSLA: new Date(),
        slaEmRisco: true,
        tempoRestanteSLA: 2.5
      },
      metricas: {
        ticketsHoje: 15,
        ticketsAbertos: 23,
        ticketsResolvidosHoje: 12,
        tempoMedioResposta: 15,
        tempoMedioResolucao: 18.5,
        slaCumprido: 94.2,
        csatMedio: 4.7
      }
    };
  }
}
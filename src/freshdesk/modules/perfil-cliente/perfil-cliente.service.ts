// src/freshdesk/modules/perfil-cliente/perfil-cliente.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class PerfilClienteService {
  async buscarPerfilCompleto(clienteId: string) {
    return {
      id: clienteId,
      nome: 'Cliente Exemplo',
      email: 'cliente@email.com',
      telefone: '(11) 99999-9999',
      totalTickets: 10,
      clienteDesde: new Date(),
      diasComoCliente: 30,
      ticketsAbertos: 2,
      ticketsResolvidos: 8,
      ultimoTicket: new Date(),
      processadoEm: new Date()
    };
  }

  async buscarHistoricoComportamento(clienteId: string) {
    return {
      jaCancelouAntes: false,
      problemaPagamento: false,
      precisouIntegracao: true,
      mediaAvaliacoes: 4.5,
      ticketsPorMes: 3.2,
      ultimoContato: new Date()
    };
  }
}
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * Enum para períodos de tempo
 */
export enum Periodo {
  ULTIMOS_7_DIAS = '7d',
  ULTIMOS_30_DIAS = '30d',
  ULTIMO_MES = '1m',
  ULTIMOS_3_MESES = '3m',
  ULTIMOS_6_MESES = '6m',
  ULTIMO_ANO = '1y',
}

@Injectable()
export class FreshdeskService {
  private readonly logger = new Logger(FreshdeskService.name);
  private readonly freshdeskDomain: string;
  private readonly freshdeskApiKey: string;

  constructor(
    private config: ConfigService,
    private httpService: HttpService,
  ) {
    // Configurações do Freshdesk - você pode usar variáveis de ambiente
    this.freshdeskDomain = this.config.get('FRESHDESK_DOMAIN') || 'https://dashboardfreshdesk.freshdesk.com';
    this.freshdeskApiKey = this.config.get('FRESHDESK_API_KEY') || '';
    
    this.logger.log('✅ Freshdesk Service inicializado');
    this.logger.log(`📊 Domínio: ${this.freshdeskDomain}`);
  }

  /**
   * Calcula a data de início baseada no período
   */
  private getDataInicio(periodo: Periodo): Date {
    const agora = new Date();
    
    switch (periodo) {
      case Periodo.ULTIMOS_7_DIAS:
        return new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
      case Periodo.ULTIMOS_30_DIAS:
        return new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000);
      case Periodo.ULTIMO_MES:
        return new Date(agora.getFullYear(), agora.getMonth() - 1, agora.getDate());
      case Periodo.ULTIMOS_3_MESES:
        return new Date(agora.getFullYear(), agora.getMonth() - 3, agora.getDate());
      case Periodo.ULTIMOS_6_MESES:
        return new Date(agora.getFullYear(), agora.getMonth() - 6, agora.getDate());
      case Periodo.ULTIMO_ANO:
        return new Date(agora.getFullYear() - 1, agora.getMonth(), agora.getDate());
      default:
        return new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Formata data para string ISO
   */
  private formatarData(data: Date): string {
    return data.toISOString();
  }

  /**
   * Headers para API do Freshdesk
   */
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${this.freshdeskApiKey}:X`).toString('base64')}`,
    };
  }

  /**
   * Busca dashboard completo com dados filtrados por período
   */
  async getDashboardCompleto(clienteId: string, periodo: Periodo) {
    const dataInicio = this.getDataInicio(periodo);
    
    try {
      // Buscar dados em paralelo
      const [perfil, ticketAtual, historico, metricas, alertas, recomendacoes] = await Promise.all([
        this.getPerfilCliente(clienteId),
        this.getTicketAtual(clienteId),
        this.getHistorico(clienteId, periodo, 1, 20),
        this.getMetricas(clienteId, periodo),
        this.getAlertas(clienteId, periodo),
        this.getRecomendacoes(clienteId, periodo),
      ]);

      return {
        alertas,
        perfil,
        ticketAtual,
        historico: historico.tickets,
        metricas,
        recomendacoes,
        periodo,
        periodoLabel: this.getPeriodoLabel(periodo),
        dataInicio: this.formatarData(dataInicio),
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error(`❌ Erro ao buscar dashboard: ${error.message}`);
      // Retorna dados mock em caso de erro (para desenvolvimento)
      return this.getDashboardMock(clienteId, periodo);
    }
  }

  /**
   * Dashboard resumido
   */
  async getDashboardResumido(clienteId: string, periodo: Periodo) {
    const metricas = await this.getMetricas(clienteId, periodo);
    const alertas = await this.getAlertas(clienteId, periodo);
    
    return {
      metricas,
      alertas,
      periodo,
      periodoLabel: this.getPeriodoLabel(periodo),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Métricas do dashboard filtradas por período
   */
  async getMetricas(clienteId: string, periodo: Periodo) {
    const dataInicio = this.getDataInicio(periodo);
    
    try {
      // Buscar tickets do cliente no período
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.freshdeskDomain}/api/v2/search/tickets?query="agent_id:${clienteId} OR created_at:>'${this.formatarData(dataInicio)}'"`,
          { headers: this.getHeaders() }
        )
      );
      
      const tickets = response.data.results || [];
      
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const ticketsHoje = tickets.filter((t: any) => new Date(t.created_at) >= hoje);
      const ticketsAbertos = tickets.filter((t: any) => t.status === 2 || t.status === 3);
      const ticketsResolvidos = tickets.filter((t: any) => t.status === 4);
      const ticketsResolvidosHoje = ticketsResolvidos.filter((t: any) => new Date(t.updated_at) >= hoje);

      // Calcular tempo médio de resposta (em minutos)
      const ticketsComResposta = tickets.filter((t: any) => t.first_responded_at);
      const tempoMedioResposta = ticketsComResposta.length > 0
        ? ticketsComResposta.reduce((acc: number, t: any) => {
            const criado = new Date(t.created_at).getTime();
            const resposta = new Date(t.first_responded_at).getTime();
            return acc + (resposta - criado) / (1000 * 60);
          }, 0) / ticketsComResposta.length
        : 0;

      // Calcular tempo médio de resolução (em minutos)
      const ticketsResolvidosComTempo = tickets.filter((t: any) => t.resolved_at);
      const tempoMedioResolucao = ticketsResolvidosComTempo.length > 0
        ? ticketsResolvidosComTempo.reduce((acc: number, t: any) => {
            const criado = new Date(t.created_at).getTime();
            const resolvido = new Date(t.resolved_at).getTime();
            return acc + (resolvido - criado) / (1000 * 60);
          }, 0) / ticketsResolvidosComTempo.length
        : 0;

      return {
        ticketsHoje: ticketsHoje.length,
        ticketsAbertos: ticketsAbertos.length,
        ticketsEmAndamento: tickets.filter((t: any) => t.status === 3).length,
        ticketsResolvidosHoje: ticketsResolvidosHoje.length,
        totalTickets: tickets.length,
        tempoMedioResposta: Math.round(tempoMedioResposta),
        tempoMedioResolucao: Math.round(tempoMedioResolucao),
        slaCumprido: tickets.length > 0 
          ? Math.round((tickets.filter((t: any) => t.sla_status === 0).length / tickets.length) * 100)
          : 100,
        periodo,
        periodoLabel: this.getPeriodoLabel(periodo),
      };
    } catch (error: any) {
      this.logger.error(`❌ Erro ao buscar métricas: ${error.message}`);
      return this.getMetricasMock(periodo);
    }
  }

  /**
   * Histórico de tickets filtrado por período
   */
  async getHistorico(clienteId: string, periodo: Periodo, page: number = 1, limit: number = 20) {
    const dataInicio = this.getDataInicio(periodo);
    
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.freshdeskDomain}/api/v2/search/tickets?query="created_at:>'${this.formatarData(dataInicio)}'"&page=${page}&per_page=${limit}`,
          { headers: this.getHeaders() }
        )
      );
      
      const tickets = (response.data.results || []).map((t: any) => ({
        id: t.id.toString(),
        numero: t.id,
        assunto: t.subject,
        criadoEm: t.created_at,
        resolvidoEm: t.resolved_at,
        status: this.getStatusLabel(t.status),
        prioridade: this.getPrioridadeLabel(t.priority),
        tipo: t.type || 'Outro',
        tempoResolucao: t.resolved_at 
          ? Math.round((new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / (1000 * 60))
          : null,
      }));

      return {
        tickets,
        total: response.data.total || tickets.length,
        page,
        limit,
        periodo,
      };
    } catch (error: any) {
      this.logger.error(`❌ Erro ao buscar histórico: ${error.message}`);
      return {
        tickets: [],
        total: 0,
        page,
        limit,
        periodo,
      };
    }
  }

  /**
   * Alertas do cliente
   */
  async getAlertas(clienteId: string, periodo: Periodo) {
    const historico = await this.getHistorico(clienteId, periodo, 1, 50);
    const tickets = historico.tickets;
    
    const ticketsAbertos = tickets.filter((t: any) => t.status === 'Aberto' || t.status === 'Pendente');
    const ticketsAltaPrioridade = tickets.filter((t: any) => t.prioridade === 'Alta' || t.prioridade === 'Urgente');
    
    return {
      flagUrgente: ticketsAltaPrioridade.length > 0,
      flagVIP: tickets.length > 10,
      flagEspecializado: tickets.some((t: any) => t.tipo === 'Bug' || t.tipo === 'Problema'),
      scoreRisco: ticketsAbertos.length > 5 ? 'ALTO' : ticketsAbertos.length > 2 ? 'MÉDIO' : 'BAIXO',
      scoreRecorrencia: tickets.length > 15 ? 'ALTA' : tickets.length > 5 ? 'MÉDIA' : 'BAIXA',
      classificacao: tickets.length > 20 ? 'VIP' : tickets.length > 10 ? 'RECORRENTE' : 'OCASIONAL',
      dadosAdicionais: {
        totalTickets: tickets.length,
        ticketsAbertos: ticketsAbertos.length,
        ticketsAltaPrioridade: ticketsAltaPrioridade.length,
      },
      periodo,
    };
  }

  /**
   * Perfil do cliente
   */
  async getPerfilCliente(clienteId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.freshdeskDomain}/api/v2/contacts/${clienteId}`,
          { headers: this.getHeaders() }
        )
      );
      
      const contact = response.data;
      
      // Buscar contagem de tickets
      const ticketsResponse = await firstValueFrom(
        this.httpService.get(
          `${this.freshdeskDomain}/api/v2/search/tickets?query="contact_id:${clienteId}"&per_page=1`,
          { headers: this.getHeaders() }
        )
      );
      
      return {
        id: contact.id.toString(),
        nome: contact.name,
        email: contact.email,
        telefone: contact.phone,
        empresa: contact.company_id?.toString(),
        totalTickets: ticketsResponse.data.total || 0,
        clienteDesde: contact.created_at,
        diasComoCliente: Math.floor((Date.now() - new Date(contact.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        ticketsAbertos: 0,
        ticketsResolvidos: 0,
        ticketsCancelados: 0,
        ultimoTicket: contact.updated_at,
        ultimoTicketDias: Math.floor((Date.now() - new Date(contact.updated_at).getTime()) / (1000 * 60 * 60 * 24)),
        processadoEm: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error(`❌ Erro ao buscar perfil: ${error.message}`);
      return this.getPerfilMock(clienteId);
    }
  }

  /**
   * Ticket atual do cliente
   */
  async getTicketAtual(clienteId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.freshdeskDomain}/api/v2/search/tickets?query="status:2 OR status:3"&per_page=1&sort_by=created_at&sort_order=desc`,
          { headers: this.getHeaders() }
        )
      );
      
      if (!response.data.results || response.data.results.length === 0) {
        return null;
      }
      
      const ticket = response.data.results[0];
      
      return {
        id: ticket.id.toString(),
        numero: ticket.id,
        assunto: ticket.subject,
        descricao: ticket.description,
        tipo: ticket.type || 'Outro',
        prioridade: ticket.priority,
        prioridadeLabel: this.getPrioridadeLabel(ticket.prioridade),
        status: ticket.status,
        statusLabel: this.getStatusLabel(ticket.status),
        criadoEm: ticket.created_at,
        atualizadoEm: ticket.updated_at,
        prazoSLA: ticket.sla_policy?.breach_at,
        prazoPrimeiraResposta: ticket.first_response_sla?.breach_at,
        slaEmRisco: ticket.sla_status > 0,
        tempoRestanteSLA: 0,
        grupo: ticket.group_id?.toString(),
        atendente: ticket.responder_id?.toString(),
        tags: ticket.tags || [],
      };
    } catch (error: any) {
      this.logger.error(`❌ Erro ao buscar ticket atual: ${error.message}`);
      return null;
    }
  }

  /**
   * Recomendações baseadas nos dados
   */
  async getRecomendacoes(clienteId: string, periodo: Periodo) {
    const alertas = await this.getAlertas(clienteId, periodo);
    const recomendacoes: any[] = [];
    
    if (alertas.flagUrgente) {
      recomendacoes.push({
        id: '1',
        acaoSugerida: 'ATENDER_URGENTE',
        detalhes: 'Cliente possui tickets de alta prioridade aguardando atendimento',
        prioridadeSugerida: 4,
        categoria: 'urgente',
        automatica: true,
      });
    }
    
    if (alertas.scoreRisco === 'ALTO') {
      recomendacoes.push({
        id: '2',
        acaoSugerida: 'CONTATO_PROATIVO',
        detalhes: 'Score de risco alto detectado. Recomendado contato proativo.',
        prioridadeSugerida: 3,
        categoria: 'risco',
        automatica: true,
      });
    }
    
    if (alertas.flagVIP) {
      recomendacoes.push({
        id: '3',
        acaoSugerida: 'ATENCAO_VIP',
        detalhes: 'Cliente VIP detectado. Garantir atendimento prioritário.',
        prioridadeSugerida: 3,
        categoria: 'vip',
        automatica: true,
      });
    }
    
    if (alertas.scoreRecorrencia === 'ALTA') {
      recomendacoes.push({
        id: '4',
        acaoSugerida: 'ANALISAR_RECORRENCIA',
        detalhes: 'Alta recorrência de tickets. Avaliar necessidade de treinamento ou documentação.',
        prioridadeSugerida: 2,
        categoria: 'recorrencia',
        automatica: true,
      });
    }
    
    return recomendacoes;
  }

  /**
   * Converte período para label
   */
  private getPeriodoLabel(periodo: Periodo): string {
    const labels: Record<Periodo, string> = {
      [Periodo.ULTIMOS_7_DIAS]: 'Últimos 7 dias',
      [Periodo.ULTIMOS_30_DIAS]: 'Últimos 30 dias',
      [Periodo.ULTIMO_MES]: 'Último mês',
      [Periodo.ULTIMOS_3_MESES]: 'Últimos 3 meses',
      [Periodo.ULTIMOS_6_MESES]: 'Últimos 6 meses',
      [Periodo.ULTIMO_ANO]: 'Último ano',
    };
    return labels[periodo] || 'Últimos 30 dias';
  }

  /**
   * Converte status number para label
   */
  private getStatusLabel(status: number): string {
    const labels: Record<number, string> = {
      1: 'Novo',
      2: 'Aberto',
      3: 'Pendente',
      4: 'Resolvido',
      5: 'Fechado',
    };
    return labels[status] || 'Desconhecido';
  }

  /**
   * Converte prioridade number para label
   */
  private getPrioridadeLabel(prioridade: number): string {
    const labels: Record<number, string> = {
      1: 'Baixa',
      2: 'Média',
      3: 'Alta',
      4: 'Urgente',
    };
    return labels[prioridade] || 'Normal';
  }

  /**
   * Exporta dados para CSV
   */
  exportToCSV(data: any): string {
    const headers = ['Métrica', 'Valor', 'Período'];
    const rows = [
      ['Tickets Hoje', data.metricas?.ticketsHoje?.toString() || '0', data.periodoLabel],
      ['Tickets Abertos', data.metricas?.ticketsAbertos?.toString() || '0', data.periodoLabel],
      ['Tickets Resolvidos Hoje', data.metricas?.ticketsResolvidosHoje?.toString() || '0', data.periodoLabel],
      ['Tempo Médio Resposta (min)', data.metricas?.tempoMedioResposta?.toString() || '0', data.periodoLabel],
      ['Tempo Médio Resolução (min)', data.metricas?.tempoMedioResolucao?.toString() || '0', data.periodoLabel],
      ['SLA Cumprido (%)', data.metricas?.slaCumprido?.toString() || '0', data.periodoLabel],
      ['Score Risco', data.alertas?.scoreRisco || 'N/A', data.periodoLabel],
      ['Score Recorrência', data.alertas?.scoreRecorrencia || 'N/A', data.periodoLabel],
      ['Classificação', data.alertas?.classificacao || 'N/A', data.periodoLabel],
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  // ========== DADOS MOCK (para desenvolvimento) ==========

  private getDashboardMock(clienteId: string, periodo: Periodo) {
    return {
      alertas: {
        flagUrgente: false,
        flagVIP: true,
        flagEspecializado: false,
        scoreRisco: 'BAIXO',
        scoreRecorrencia: 'MÉDIA',
        classificacao: 'VIP',
        dadosAdicionais: {
          totalTickets: 15,
          ticketsAbertos: 2,
        },
      },
      perfil: this.getPerfilMock(clienteId),
      ticketAtual: null,
      historico: [],
      metricas: this.getMetricasMock(periodo),
      recomendacoes: [],
      periodo,
      periodoLabel: this.getPeriodoLabel(periodo),
      timestamp: new Date().toISOString(),
    };
  }

  private getPerfilMock(clienteId: string) {
    return {
      id: clienteId,
      nome: 'Cliente Demo',
      email: 'demo@exemplo.com',
      telefone: '(11) 99999-9999',
      empresa: 'Empresa Demo',
      totalTickets: 15,
      clienteDesde: '2024-01-01',
      diasComoCliente: 365,
      ticketsAbertos: 2,
      ticketsResolvidos: 13,
      ticketsCancelados: 0,
      ultimoTicket: '2024-12-01',
      ultimoTicketDias: 30,
      processadoEm: new Date().toISOString(),
    };
  }

  private getMetricasMock(periodo: Periodo) {
    return {
      ticketsHoje: 3,
      ticketsAbertos: 5,
      ticketsEmAndamento: 2,
      ticketsResolvidosHoje: 1,
      totalTickets: 25,
      tempoMedioResposta: 45,
      tempoMedioResolucao: 120,
      slaCumprido: 92,
      periodo,
      periodoLabel: this.getPeriodoLabel(periodo),
    };
  }
}


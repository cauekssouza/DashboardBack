import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { subDays, format } from 'date-fns';

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardMetrics(range: string = '30d') {
    console.log('📊 [MetricsService] Iniciando getDashboardMetrics com range:', range);
    
    let startDate = new Date();
    switch(range) {
      case '7d': startDate = subDays(startDate, 7); break;
      case '15d': startDate = subDays(startDate, 15); break;
      case '30d': startDate = subDays(startDate, 30); break;
      case '90d': startDate = subDays(startDate, 90); break;
      default: startDate = subDays(startDate, 30);
    }
    console.log('📅 Data de corte:', startDate);

    const tickets = await this.prisma.ticket.findMany({
      where: {
        timestamp: { gte: startDate }
      }
    });
    console.log(`📊 Total de tickets encontrados: ${tickets.length}`);

    const totalTickets = tickets.length;
    
    // Buscar top solicitantes com tratamento de erro
    let topSolicitantes: Array<{ nome: string; email: string; count: number }> = [];
    try {
      topSolicitantes = await this.getTopSolicitantes(startDate);
      console.log(`👥 Top solicitantes encontrados: ${topSolicitantes.length}`);
    } catch (error) {
      console.error('Erro ao buscar top solicitantes:', error);
      topSolicitantes = [];
    }
    
    // Mapear status para nomes amigáveis
    const statusMap: Record<string, string> = {
      'Open': 'Aberto',
      'Closed': 'Fechado',
      'Resolved': 'Resolvido',
      'Aguardando Cliente': 'Aguardando Cliente',
      'Pending': 'Pendente',
      'In Progress': 'Em Andamento',
      'Waiting': 'Aguardando',
      'Canceled': 'Cancelado'
    };

    // Agrupar tickets por status com nomes normalizados
    const ticketsPorStatusRaw = this.groupBy(tickets, 'status');
    const ticketsPorStatus: Record<string, number> = {};
    
    Object.entries(ticketsPorStatusRaw).forEach(([status, count]) => {
      const normalizedStatus = statusMap[status] || status || 'Não informado';
      ticketsPorStatus[normalizedStatus] = (ticketsPorStatus[normalizedStatus] || 0) + (count as number);
    });

    // MÉTRICAS - Distribuição por Categoria
    const ticketsPorCategoria: Record<string, number> = {};
    tickets.forEach(ticket => {
      if (ticket.categoria) {
        const categoria = ticket.categoria || 'Não categorizado';
        ticketsPorCategoria[categoria] = (ticketsPorCategoria[categoria] || 0) + 1;
      }
    });
    console.log(`📊 Distribuição por categoria: ${Object.keys(ticketsPorCategoria).length} categorias`);

    // MÉTRICAS - Top Confiança
    console.log('🔍 Calculando topConfianca...');
    
    const ticketsComConfianca = tickets.filter(t => t.confianca !== null && t.confianca !== undefined);
    console.log(`✅ Tickets com confiança: ${ticketsComConfianca.length} de ${tickets.length}`);
    
    const topConfianca = ticketsComConfianca
      .map(t => ({
        nome: t.nome || 'Nome não informado',
        confianca: t.confianca as number
      }))
      .sort((a, b) => b.confianca - a.confianca)
      .slice(0, 10);

    console.log('🏆 Top 10 confiança calculados:', topConfianca.length);

    // 📞 MÉTRICAS PARA CONVERSAS DO FRESHDESK
    console.log('📞 Calculando métricas de conversas...');
    
    const conversasFreshdesk = tickets.filter(t => t.idConversa);
    const totalMensagens = conversasFreshdesk.reduce((acc, t) => {
      if (!t.mensagens) return acc;
      const parsed = parseInt(t.mensagens, 10);
      return acc + (isNaN(parsed) ? 0 : parsed);
    }, 0);
    
    console.log(`📞 Conversas Freshdesk: ${conversasFreshdesk.length} - ${totalMensagens} mensagens`);

    // 💰 MÉTRICAS PARA PAGAMENTOS
    console.log('💰 Calculando métricas de pagamentos...');
    
    const pagamentos = tickets.filter(t => t.problemaPagamento === 'PAGO');
    const totalPago = pagamentos.reduce((acc, t) => acc + (t.valorPago || 0), 0);
    const pagamentosHoje = pagamentos.filter(p => {
      if (!p.dataPagamento) return false;
      const hoje = new Date().toDateString();
      return new Date(p.dataPagamento).toDateString() === hoje;
    }).length;
    const mediaPago = pagamentos.length > 0 ? totalPago / pagamentos.length : 0;

    console.log(`💰 Pagamentos: ${pagamentos.length} - Total: R$ ${totalPago}`);

    // Métricas completas
    const metrics = {
      // Métricas básicas
      totalTickets: totalTickets || 0,
      ticketsAbertos: tickets.filter(t => t?.status === 'Open').length || 0,
      ticketsFechados: tickets.filter(t => t?.status === 'Closed' || t?.status === 'Resolved').length || 0,
      ticketsUrgentes: tickets.filter(t => t?.scoreRisco === 'ALTO').length || 0,
      ticketsVIP: tickets.filter(t => t?.classificacao === 'VIP').length || 0,
      
      // Distribuições
      ticketsPorStatus: ticketsPorStatus || {},
      ticketsPorRisco: this.groupBy(tickets, 'scoreRisco') || {},
      ticketsPorClassificacao: this.groupBy(tickets, 'classificacao') || {},
      
      // Métricas de categoria e confiança
      ticketsPorCategoria: ticketsPorCategoria || {},
      topConfianca: topConfianca.length > 0 ? topConfianca : [],
      
      // Tickets por dia
      ticketsPorDia: this.getTicketsPerDay(tickets, startDate) || [],
      
      // Top solicitantes
      topSolicitantes: topSolicitantes || [],
      
      // Taxa de cancelamento
      taxaCancelamento: totalTickets > 0 
        ? Number(((tickets.filter(t => t?.cancelouAntes === 'SIM').length / totalTickets) * 100).toFixed(1))
        : 0,
      
      // 📞 MÉTRICAS - CONVERSAS FRESHDESK
      conversasFreshdesk: {
        total: conversasFreshdesk.length,
        mensagens: totalMensagens
      },
      
      // 💰 MÉTRICAS - PAGAMENTOS
      pagamentos: {
        total: pagamentos.length,
        valor: totalPago,
        hoje: pagamentosHoje,
        media: mediaPago
      }
    };

    console.log('📊 Métricas finais - OK');
    
    return metrics;
  }

  private groupBy(tickets: any[], key: string): Record<string, number> {
    if (!tickets || tickets.length === 0) return {};
    
    return tickets.reduce((acc, ticket) => {
      if (!ticket) return acc;
      const value = ticket[key];
      if (value) {
        acc[value] = (acc[value] || 0) + 1;
      }
      return acc;
    }, {});
  }

  private getTicketsPerDay(tickets: any[], startDate: Date): Array<{ date: string; count: number }> {
    if (!tickets || tickets.length === 0) return [];
    
    const ticketsPerDay = tickets.reduce((acc, ticket) => {
      if (!ticket?.timestamp) return acc;
      try {
        const date = format(new Date(ticket.timestamp), 'yyyy-MM-dd');
        acc[date] = (acc[date] || 0) + 1;
      } catch (error) {
        console.error('Erro ao formatar data:', error);
      }
      return acc;
    }, {});

    return Object.entries(ticketsPerDay)
      .map(([date, count]) => ({ date, count: count as number }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getTopSolicitantes(startDate: Date, limit: number = 10): Promise<Array<{ nome: string; email: string; count: number }>> {
    try {
      const result = await this.prisma.$queryRaw<
        Array<{ email: string; nome: string; count: bigint }>
      >`
        SELECT 
          email, 
          nome, 
          COUNT(*) as count
        FROM "Ticket"
        WHERE timestamp >= ${startDate}
          AND email IS NOT NULL 
          AND nome IS NOT NULL
          AND email != ''
          AND nome != ''
        GROUP BY email, nome
        ORDER BY count DESC
        LIMIT ${limit}
      `;

      return result.map(item => ({
        nome: item.nome || 'Nome não informado',
        email: item.email || 'email@nao.informado',
        count: Number(item.count),
      }));
    } catch (error) {
      console.error('Erro em getTopSolicitantes:', error);
      return [];
    }
  }

  async getMetricsByPeriod(startDate: Date, endDate: Date) {
    try {
      const tickets = await this.prisma.ticket.findMany({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const statusMap: Record<string, string> = {
        'Open': 'Aberto',
        'Closed': 'Fechado',
        'Resolved': 'Resolvido',
        'Aguardando Cliente': 'Aguardando Cliente',
        'Pending': 'Pendente',
        'In Progress': 'Em Andamento',
        'Waiting': 'Aguardando',
        'Canceled': 'Cancelado'
      };

      const ticketsPorStatusRaw = this.groupBy(tickets, 'status');
      const ticketsPorStatus: Record<string, number> = {};
      
      Object.entries(ticketsPorStatusRaw).forEach(([status, count]) => {
        const normalizedStatus = statusMap[status] || status || 'Não informado';
        ticketsPorStatus[normalizedStatus] = (ticketsPorStatus[normalizedStatus] || 0) + (count as number);
      });

      return {
        periodo: {
          inicio: startDate,
          fim: endDate,
        },
        total: tickets.length || 0,
        porStatus: ticketsPorStatus || {},
        porRisco: this.groupBy(tickets, 'scoreRisco') || {},
      };
    } catch (error) {
      console.error('Erro em getMetricsByPeriod:', error);
      return {
        periodo: { inicio: startDate, fim: endDate },
        total: 0,
        porStatus: {},
        porRisco: {},
      };
    }
  }

  async getClientSummary(email: string) {
    try {
      const tickets = await this.prisma.ticket.findMany({
        where: { email },
        orderBy: { timestamp: 'desc' },
      });

      if (!tickets || tickets.length === 0) {
        return null;
      }

      const firstTicket = tickets[tickets.length - 1];
      const lastTicket = tickets[0];

      return {
        email,
        nome: tickets[0]?.nome || 'Nome não informado',
        totalTickets: tickets.length,
        ticketsAbertos: tickets.filter(t => t?.status === 'Open').length || 0,
        primeiroTicket: firstTicket?.timestamp || null,
        ultimoTicket: lastTicket?.timestamp || null,
        scoreRiscoPredominante: this.getMostFrequent(tickets.map(t => t?.scoreRisco).filter(Boolean)) || 'N/A',
        jaCancelou: tickets.some(t => t?.cancelouAntes === 'SIM') || false,
        precisaIntegracao: tickets.some(t => t?.precisouIntegracao === 'SIM') || false,
        tickets: tickets.slice(0, 5) || [],
      };
    } catch (error) {
      console.error('Erro em getClientSummary:', error);
      return null;
    }
  }

  private getMostFrequent(arr: string[]): string {
    if (!arr || arr.length === 0) return '';
    
    try {
      const frequency = arr.reduce((acc, val) => {
        if (val) {
          acc[val] = (acc[val] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      return Object.keys(frequency).reduce((a, b) => 
        frequency[a] > frequency[b] ? a : b
      );
    } catch (error) {
      console.error('Erro em getMostFrequent:', error);
      return '';
    }
  }
}
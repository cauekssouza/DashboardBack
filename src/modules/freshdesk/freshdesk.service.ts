import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { SheetsGateway } from '../tickets/sheets/sheets.gateway';
import { 
  FreshdeskTicket, 
  FreshdeskContact, 
  FreshdeskConversation,
  MappedTicketData 
} from './freshdesk.types';

@Injectable()
export class FreshdeskService {
  private readonly logger = new Logger(FreshdeskService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private lastSyncHash: string = '';

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private sheetsGateway: SheetsGateway,
  ) {
    // 👇 CORREÇÃO 1: Usar operador ! para garantir que não é undefined
    this.baseUrl = this.configService.get<string>('FRESHDESK_URL')!;
    this.apiKey = this.configService.get<string>('FRESHDESK_API_KEY')!;
    
    if (!this.baseUrl || !this.apiKey) {
      this.logger.error('❌ FRESHDESK_URL ou FRESHDESK_API_KEY não configurados');
    }
  }

  private getAuthHeader() {
    const auth = Buffer.from(`${this.apiKey}:X`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    };
  }

  @Cron('*/30 * * * * *') // A CADA 30 SEGUNDOS
  async syncFreshdeskTickets() {
    this.logger.log('🔄 Iniciando sincronização com Freshdesk...');

    try {
      const lastSync = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const tickets = await this.fetchTickets(lastSync);
      
      if (!tickets || tickets.length === 0) {
        this.logger.log('⏭️ Nenhum novo ticket encontrado');
        return { success: true, imported: 0 };
      }

      this.logger.log(`📥 Processando ${tickets.length} tickets`);
      
      let imported = 0;
      let errors = 0;
      // 👇 CORREÇÃO 2: Removido o array importedTickets que não estava sendo usado

      for (const ticket of tickets) {
        try {
          const mappedData = await this.mapTicketData(ticket);
          await this.upsertTicket(mappedData);
          imported++;
          this.logger.log(`✅ Ticket ${ticket.id} processado`);
        } catch (error) {
          errors++;
          this.logger.error(`❌ Erro no ticket ${ticket.id}:`, error.message);
        }
      }

      if (imported > 0) {
        this.sheetsGateway.notifyUpdate({
          imported,
          errors,
          total: tickets.length,
          source: 'freshdesk',
          timestamp: new Date(),
        });
      }

      this.logger.log(`✅ Sincronização Freshdesk: ${imported} importados, ${errors} erros`);
      
      return { success: true, imported, errors, total: tickets.length };
      
    } catch (error) {
      this.logger.error('❌ Erro na sincronização Freshdesk:', error);
      throw error;
    }
  }

  private async fetchTickets(updatedSince: string): Promise<FreshdeskTicket[]> {
    try {
      const url = `${this.baseUrl}/tickets?updated_since=${updatedSince}&order_by=created_at&order_type=desc`;
      this.logger.debug(`Buscando tickets: ${url}`);

      const response = await fetch(url, {
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        throw new Error(`Erro na API Freshdesk: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error('Erro ao buscar tickets:', error);
      return [];
    }
  }

  private async fetchContact(contactId: number): Promise<FreshdeskContact | null> {
    try {
      const response = await fetch(`${this.baseUrl}/contacts/${contactId}`, {
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      return null;
    }
  }

  private async fetchConversations(ticketId: number): Promise<FreshdeskConversation[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tickets/${ticketId}/conversations`, {
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        return [];
      }

      return await response.json();
    } catch (error) {
      return [];
    }
  }

  private async getTicketCountByEmail(email: string): Promise<number> {
    try {
      const tickets = await this.prisma.ticket.findMany({
        where: { email },
      });
      return tickets.length;
    } catch (error) {
      return 0;
    }
  }

  private async getClientSince(email: string): Promise<Date | null> {
    try {
      const firstTicket = await this.prisma.ticket.findFirst({
        where: { email },
        orderBy: { timestamp: 'asc' },
      });
      return firstTicket?.timestamp || null;
    } catch (error) {
      return null;
    }
  }

  private calcularScoreRisco(ticket: FreshdeskTicket): 'ALTO' | 'MEDIO' | 'BAIXO' {
    if (ticket.priority >= 3) return 'ALTO';
    if (ticket.priority === 2) return 'MEDIO';
    return 'BAIXO';
  }

  private calcularRecorrencia(totalTickets: number): 'ALTA' | 'MEDIA' | 'BAIXA' {
    if (totalTickets > 10) return 'ALTA';
    if (totalTickets > 5) return 'MEDIA';
    return 'BAIXA';
  }

  private verificarCancelamento(ticket: FreshdeskTicket): 'SIM' | 'NÃO' {
    const assunto = ticket.subject?.toLowerCase() || '';
    const tags = ticket.tags || [];
    
    if (assunto.includes('cancelamento') || assunto.includes('cancelar') || tags.includes('cancelamento')) {
      return 'SIM';
    }
    return 'NÃO';
  }

  private verificarIntegracao(ticket: FreshdeskTicket): 'SIM' | 'NÃO' {
    const assunto = ticket.subject?.toLowerCase() || '';
    const tags = ticket.tags || [];
    
    if (assunto.includes('integração') || assunto.includes('api') || tags.includes('integracao')) {
      return 'SIM';
    }
    return 'NÃO';
  }

  private verificarPagamento(ticket: FreshdeskTicket): string | undefined {
    const assunto = ticket.subject?.toLowerCase() || '';
    const tags = ticket.tags || [];
    
    if (assunto.includes('pagamento') || assunto.includes('boleto') || tags.includes('pagamento')) {
      return 'PENDENTE';
    }
    return undefined;
  }

  private calcularConfianca(ticket: FreshdeskTicket, conversas: FreshdeskConversation[]): number {
    let confianca = 0.7; // Base
    
    if (ticket.status === 4) confianca += 0.15;
    if (ticket.status === 5) confianca += 0.1;
    if (ticket.priority >= 3) confianca += 0.1;
    if (conversas.length > 5) confianca -= 0.1;
    if (conversas.length > 10) confianca -= 0.1;
    
    return Math.min(Math.max(confianca, 0), 1);
  }

  private classificarTicket(ticket: FreshdeskTicket): string {
    if (ticket.priority >= 3) return 'URGENTE';
    if (ticket.type?.toLowerCase() === 'billing') return 'FINANCEIRO';
    if (ticket.type?.toLowerCase() === 'technical') return 'TÉCNICO';
    return 'GERAL';
  }

  private gerarRecomendacao(ticket: FreshdeskTicket): string {
    if (ticket.priority >= 3) return 'Atendimento prioritário';
    if (ticket.status === 3) return 'Acompanhar pendência';
    return 'Atendimento padrão';
  }

  private identificarPilar(ticket: FreshdeskTicket): string {
    if (ticket.type?.toLowerCase() === 'billing') return 'FINANCEIRO';
    if (ticket.type?.toLowerCase() === 'technical') return 'TÉCNICO';
    if (ticket.type?.toLowerCase() === 'sales') return 'VENDAS';
    return 'ATENDIMENTO';
  }

  private definirAcao(ticket: FreshdeskTicket, confianca: number): string {
    if (confianca < 0.5) return 'REVISAR_MANUALMENTE';
    if (ticket.priority >= 3) return 'ALERTA_CS';
    if (ticket.status === 3) return 'ACOMPANHAR';
    return 'FLUXO_PADRAO';
  }

  private mapSource(source: number): string {
    const sourceMap: Record<number, string> = {
      1: 'Email',
      2: 'Portal',
      3: 'Telefone',
      4: 'Chat',
      5: 'Mercado',
      6: 'Feedback Widget',
      7: 'Yammer',
      8: 'AWS Case',
      9: 'API',
    };
    return sourceMap[source] || 'Outro';
  }

  private mapStatus(status: number): string {
    const statusMap: Record<number, string> = {
      2: 'Open',
      3: 'Pending',
      4: 'Resolved',
      5: 'Closed',
    };
    return statusMap[status] || 'Open';
  }

  private async mapTicketData(ticket: FreshdeskTicket): Promise<MappedTicketData> {
    const [contact, conversas] = await Promise.all([
      ticket.requester_id ? this.fetchContact(ticket.requester_id) : null,
      this.fetchConversations(ticket.id),
    ]);

    const totalTickets = await this.getTicketCountByEmail(contact?.email || '');
    const clienteDesde = await this.getClientSince(contact?.email || '');
    
    const diasComoCliente = clienteDesde 
      ? Math.floor((Date.now() - clienteDesde.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const scoreRisco = this.calcularScoreRisco(ticket);
    const recorrencia = this.calcularRecorrencia(totalTickets);
    const cancelouAntes = this.verificarCancelamento(ticket);
    const precisouIntegracao = this.verificarIntegracao(ticket);
    const confianca = this.calcularConfianca(ticket, conversas);

    return {
      ticketId: ticket.id,
      timestamp: new Date(ticket.created_at),
      nome: contact?.name || 'Não informado',
      email: contact?.email || 'email@nao.informado',
      assunto: ticket.subject || '',
      totalTickets,
      urgente: ticket.priority >= 3 ? 'SIM' : 'NÃO',
      vip: 'NÃO',
      especializado: ticket.type === 'technical' ? 'SIM' : 'NÃO',
      scoreRisco,
      recorrencia,
      classificacao: this.classificarTicket(ticket),
      recomendacao: this.gerarRecomendacao(ticket),
      cancelouAntes,
      precisouIntegracao,
      diasComoCliente,
      status: this.mapStatus(ticket.status),
      
      problemaPagamento: this.verificarPagamento(ticket),
      clienteDesde: clienteDesde || undefined,
      prazo: ticket.due_by ? new Date(ticket.due_by) : undefined,
      
      // 🔥 DADOS DAS CONVERSAS DO BOT
      idConversa: String(ticket.id),
      chat: this.mapSource(ticket.source),
      mensagens: String(conversas.length),
    };
  }

  private async upsertTicket(data: MappedTicketData) {
    return this.prisma.ticket.upsert({
      where: { ticketId: data.ticketId },
      update: data,
      create: data,
    });
  }

  async manualSync() {
    this.logger.log('👤 Sincronização manual iniciada');
    return this.syncFreshdeskTickets();
  }

  async testConnection() {
    try {
      const tickets = await this.fetchTickets(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      return {
        success: true,
        message: 'Conexão com Freshdesk OK',
        ticketCount: tickets.length,
        sample: tickets.slice(0, 2),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro na conexão',
        error: error.message,
      };
    }
  }
}
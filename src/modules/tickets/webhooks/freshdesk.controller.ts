import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Controller('webhooks/freshdesk')
export class FreshdeskWebhookController {
  constructor(private prisma: PrismaService) {}

  @Post('ticket-created')
  @HttpCode(200)
  async handleTicketCreated(@Body() ticketData: any, @Headers() headers: any) {
    console.log('📢 Novo ticket do Freshdesk:', ticketData);
    
    try {
      const ticketId = ticketData.id;
      
      if (!ticketId) {
        return { success: false, error: 'ID do ticket não fornecido' };
      }

      // Verificar se o ticket já existe
      const existingTicket = await this.prisma.ticket.findUnique({
        where: { ticketId: ticketId }
      });

      const ticket = this.buildTicketData(ticketData);

      if (existingTicket) {
        // Atualizar existente
        await this.prisma.ticket.update({
          where: { ticketId: ticketId },
          data: ticket
        });
        console.log(`✅ Ticket ${ticketId} atualizado`);
      } else {
        // Criar novo
        await this.prisma.ticket.create({
          data: ticket
        });
        console.log(`✅ Ticket ${ticketId} criado`);
      }

      return { 
        success: true, 
        message: 'Ticket processado',
        ticketId: ticketId 
      };
      
    } catch (error) {
      console.error('❌ Erro ao processar webhook:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  private buildTicketData(ticketData: any) {
    const ticketId = ticketData.id;
    const timestamp = ticketData.created_at ? new Date(ticketData.created_at) : new Date();
    const nome = ticketData.requester?.name || 'Não informado';
    const email = ticketData.requester?.email || 'email@nao.informado';
    const assunto = ticketData.subject || '';
    const status = this.mapStatus(ticketData.status);
    const prioridade = ticketData.priority || 2;

    return {
      // Campos obrigatórios
      ticketId,
      timestamp,
      nome,
      email,
      assunto,
      status,
      
      // Campos com valores padrão
      totalTickets: 1,
      urgente: 'NÃO',
      vip: 'NÃO',
      especializado: 'NÃO',
      scoreRisco: 'BAIXO',
      recorrencia: 'BAIXA',
      classificacao: 'NOVO',
      recomendacao: 'Atendimento padrão',
      cancelouAntes: 'NÃO',
      precisouIntegracao: 'NÃO',
      diasComoCliente: 0,
      
      // Campos opcionais
      prioridade,
      idConversa: `FD_${ticketId}`,
      chat: 'Freshdesk',
      mensagens: '1',
      
      // Timestamps automáticos (opcionais)
      createdAt: new Date(),
      updatedAt: new Date(),
    };
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
}
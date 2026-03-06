import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Controller('test')
export class TestController {
  constructor(private prisma: PrismaService) {}

  @Post('bot-data')
  @HttpCode(200)
  async addBotTestData() {
    try {
      // Criar dados de teste para bot e pagamentos
      const testData = [
        {
          ticketId: Math.floor(Math.random() * 1000000),
          timestamp: new Date(),
          nome: "Cliente Teste WhatsApp",
          email: "whatsapp@teste.com",
          assunto: "Conversa via Bot",
          totalTickets: 1,
          urgente: "NÃO",
          vip: "NÃO",
          especializado: "NÃO",
          scoreRisco: "BAIXO",
          recorrencia: "BAIXA",
          classificacao: "NOVO",
          recomendacao: "Atendimento padrão",
          cancelouAntes: "NÃO",
          precisouIntegracao: "NÃO",
          diasComoCliente: 0,
          status: "Open",
          // Campos do bot
          idConversa: `conv_${Date.now()}_1`,
          chat: "WhatsApp",
          mensagens: "5",
          // Campos de pagamento
          problemaPagamento: "PAGO",
          valorPago: 99.90,
          dataPagamento: new Date(),
          metodoPagamento: "PIX"
        },
        {
          ticketId: Math.floor(Math.random() * 1000000),
          timestamp: new Date(),
          nome: "Cliente Teste Telegram",
          email: "telegram@teste.com",
          assunto: "Conversa via Bot",
          totalTickets: 1,
          urgente: "NÃO",
          vip: "NÃO",
          especializado: "NÃO",
          scoreRisco: "BAIXO",
          recorrencia: "BAIXA",
          classificacao: "NOVO",
          recomendacao: "Atendimento padrão",
          cancelouAntes: "NÃO",
          precisouIntegracao: "NÃO",
          diasComoCliente: 0,
          status: "Open",
          // Campos do bot
          idConversa: `conv_${Date.now()}_2`,
          chat: "Telegram",
          mensagens: "3",
          // Campos de pagamento
          problemaPagamento: "PAGO",
          valorPago: 149.90,
          dataPagamento: new Date(),
          metodoPagamento: "Cartão"
        }
      ];

      // Inserir no banco
      for (const data of testData) {
        await this.prisma.ticket.create({ data });
      }

      return { 
        success: true, 
        message: 'Dados de teste adicionados com sucesso!',
        count: testData.length
      };
    } catch (error) {
      console.error('Erro ao adicionar dados de teste:', error);
      return { 
        success: false, 
        message: 'Erro ao adicionar dados de teste',
        error: error.message 
      };
    }
  }

  @Post('bot-data-custom')
  @HttpCode(200)
  async addCustomBotData(@Body() body: any) {
    try {
      const { nome, email, chat, mensagens, valor } = body;
      
      const newTicket = {
        ticketId: Math.floor(Math.random() * 1000000),
        timestamp: new Date(),
        nome: nome || "Cliente Teste",
        email: email || "teste@email.com",
        assunto: "Conversa via Bot",
        totalTickets: 1,
        urgente: "NÃO",
        vip: "NÃO",
        especializado: "NÃO",
        scoreRisco: "BAIXO",
        recorrencia: "BAIXA",
        classificacao: "NOVO",
        recomendacao: "Atendimento padrão",
        cancelouAntes: "NÃO",
        precisouIntegracao: "NÃO",
        diasComoCliente: 0,
        status: "Open",
        idConversa: `conv_${Date.now()}`,
        chat: chat || "WhatsApp",
        mensagens: mensagens?.toString() || "1",
        problemaPagamento: valor ? "PAGO" : "NÃO",
        valorPago: valor ? parseFloat(valor) : null,
        dataPagamento: valor ? new Date() : null,
        metodoPagamento: valor ? "PIX" : null
      };

      await this.prisma.ticket.create({ data: newTicket });

      return { 
        success: true, 
        message: 'Dado adicionado com sucesso!',
        data: newTicket
      };
    } catch (error) {
      console.error('Erro ao adicionar dado customizado:', error);
      return { 
        success: false, 
        message: 'Erro ao adicionar dado',
        error: error.message 
      };
    }
  }
}
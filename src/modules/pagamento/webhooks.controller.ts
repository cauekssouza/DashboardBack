import * as common from '@nestjs/common';
import { Request } from 'express';
import { StripeService } from './stripe.service';
import { PrismaService } from '../../database/prisma.service';
import { SheetsGateway } from '../tickets/sheets/sheets.gateway';

@common.Controller('webhooks')
export class WebhooksController {
  constructor(
    private stripeService: StripeService,
    private prisma: PrismaService,
    private sheetsGateway: SheetsGateway,
  ) {}

  @common.Post('stripe')
  @common.HttpCode(200)
  async handleStripeWebhook(
    @common.Headers('stripe-signature') signature: string,
    @common.Req() req: common.RawBodyRequest<Request>,
  ) {
    try {
      const event = this.stripeService.constructWebhookEvent(req.rawBody!, signature);

      console.log('📢 Webhook Stripe recebido:', event.type);

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object);
          break;

        case 'charge.refunded':
          await this.handleRefund(event.data.object);
          break;
      }

      return { received: true };
    } catch (error) {
      console.error('❌ Erro no webhook:', error);
      return { received: false, error: error.message };
    }
  }

  private async handlePaymentSuccess(paymentIntent: any) {
    console.log('💰 Pagamento confirmado:', paymentIntent.id);
    console.log('📋 Metadata recebido:', paymentIntent.metadata);

    // 1. Atualizar o Payment no banco
    await this.prisma.payment.update({
      where: { paymentIntentId: paymentIntent.id },
      data: {
        status: 'SUCCESS',
        paidAt: new Date(),
      },
    });

    // 2. Atualizar o Ticket se tiver ticketId no metadata
    const ticketId = paymentIntent.metadata?.ticketId;
    
    if (ticketId) {
      console.log(`🎫 Atualizando ticket ${ticketId} para PAGO`);
      
      const ticket = await this.prisma.ticket.update({
        where: { ticketId: parseInt(ticketId) },
        data: {
          problemaPagamento: 'PAGO', // 👈 ISSO APARECE NA TABELA
          valorPago: paymentIntent.amount / 100,
          dataPagamento: new Date(),
          metodoPagamento: paymentIntent.payment_method_types?.[0] || 'card',
        },
      });

      console.log('✅ Ticket atualizado:', ticket);
    }

    // 3. Notificar via WebSocket
    this.sheetsGateway.notifyUpdate({
      type: 'payment_success',
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      ticketId: ticketId,
    });
  }

  private async handlePaymentFailure(paymentIntent: any) {
    console.log('❌ Pagamento falhou:', paymentIntent.id);

    // 1. Atualizar Payment
    await this.prisma.payment.update({
      where: { paymentIntentId: paymentIntent.id },
      data: { status: 'FAILED' },
    });

    // 2. Atualizar Ticket se tiver ticketId
    const ticketId = paymentIntent.metadata?.ticketId;
    
    if (ticketId) {
      await this.prisma.ticket.update({
        where: { ticketId: parseInt(ticketId) },
        data: { problemaPagamento: 'FALHOU' },
      });
    }
  }

  private async handleRefund(charge: any) {
    console.log('↩️ Reembolso processado:', charge.id);
    
    const paymentIntent = charge.payment_intent;
    
    // 1. Atualizar Payment
    await this.prisma.payment.update({
      where: { paymentIntentId: paymentIntent },
      data: { status: 'REFUNDED' },
    });

    // 2. Atualizar Ticket (buscar o payment intent para pegar o ticketId)
    try {
      const paymentIntentData = await this.stripeService.confirmPayment(paymentIntent);
      const ticketId = paymentIntentData.metadata?.ticketId;
      
      if (ticketId) {
        await this.prisma.ticket.update({
          where: { ticketId: parseInt(ticketId) },
          data: { problemaPagamento: 'REEMBOLSADO' },
        });
      }
    } catch (error) {
      console.error('Erro ao buscar payment intent para reembolso:', error);
    }
  }
}
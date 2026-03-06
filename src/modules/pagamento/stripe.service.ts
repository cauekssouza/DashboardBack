import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { CreatePaymentDto } from './dto/create-pagamento.dto';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    
    if (!secretKey) {
      this.logger.error('❌ STRIPE_SECRET_KEY não configurada');
      throw new Error('STRIPE_SECRET_KEY não configurada');
    }

    // Inicializar Stripe sem versão específica (usa a padrão)
    this.stripe = new Stripe(secretKey, {});
  }

  async createPaymentIntent(createPaymentDto: CreatePaymentDto) {
    const { amount, currency = 'brl', customerEmail, customerName, paymentMethod = 'pix', description, ticketId } = createPaymentDto;

    this.logger.log(`💳 Criando intenção de pagamento: ${amount} ${currency}`);
    this.logger.log(`🎫 Ticket ID: ${ticketId}`);

    // Criar ou buscar cliente
    let customer;
    try {
      const customers = await this.stripe.customers.list({
        email: customerEmail,
        limit: 1,
      });
      
      if (customers.data.length > 0) {
        customer = customers.data[0];
        this.logger.log(`✅ Cliente existente encontrado: ${customer.id}`);
      } else {
        customer = await this.stripe.customers.create({
          email: customerEmail,
          name: customerName,
        });
        this.logger.log(`✅ Novo cliente criado: ${customer.id}`);
      }
    } catch (error) {
      this.logger.error('Erro ao criar/buscar cliente:', error);
      throw error;
    }

    // Configurar métodos de pagamento
    const paymentMethods = this.getPaymentMethods(paymentMethod);

    try {
      // Preparar metadata com ticketId
      const metadata: Record<string, string> = {
        customerEmail,
        customerName,
      };
      
      if (ticketId) {
        metadata.ticketId = ticketId;
        this.logger.log(`✅ Ticket ID ${ticketId} adicionado ao metadata`);
      }

      // Criar Payment Intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe trabalha em centavos
        currency: currency,
        customer: customer.id,
        description: description || `Pagamento de ${customerName}`,
        payment_method_types: paymentMethods,
        metadata, // Metadata com ticketId
      });

      this.logger.log(`✅ Payment Intent criado: ${paymentIntent.id}`);
      this.logger.log(`📋 Metadata:`, paymentIntent.metadata);

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        customerId: customer.id,
      };
    } catch (error) {
      this.logger.error('Erro ao criar Payment Intent:', error);
      throw error;
    }
  }

  private getPaymentMethods(method: string = 'pix'): string[] {
    const methods: Record<string, string[]> = {
      pix: ['pix'],
      boleto: ['boleto'],
      card: ['card'],
      all: ['card', 'pix', 'boleto'],
    };
    return methods[method] || methods.all;
  }

  async confirmPayment(paymentIntentId: string) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      return {
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        customer: paymentIntent.customer,
        metadata: paymentIntent.metadata,
      };
    } catch (error) {
      this.logger.error('Erro ao confirmar pagamento:', error);
      throw error;
    }
  }

  async getPaymentMethodsByCustomer(customerId: string) {
    try {
      const methods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });
      return methods.data;
    } catch (error) {
      this.logger.error('Erro ao buscar métodos de pagamento:', error);
      return [];
    }
  }

  async refundPayment(paymentIntentId: string, amount?: number) {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
      });
      return refund;
    } catch (error) {
      this.logger.error('Erro ao reembolsar:', error);
      throw error;
    }
  }

  constructWebhookEvent(payload: Buffer, signature: string) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET não configurada');
    }
    
    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}
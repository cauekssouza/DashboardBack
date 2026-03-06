import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StripeService } from './stripe.service';
import { CreatePaymentDto } from './dto/create-pagamento.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
  ) {}

  async createPayment(createPaymentDto: CreatePaymentDto) {
    this.logger.log('📝 Criando novo pagamento');

    try {
      // Criar payment intent no Stripe
      const paymentIntent = await this.stripeService.createPaymentIntent(createPaymentDto);

      // Salvar no banco de dados
      const payment = await this.prisma.payment.create({
        data: {
          amount: createPaymentDto.amount,
          currency: createPaymentDto.currency || 'brl',
          status: 'PENDING',
          customerEmail: createPaymentDto.customerEmail,
          customerName: createPaymentDto.customerName,
          paymentMethod: createPaymentDto.paymentMethod || 'pix',
          paymentIntentId: paymentIntent.paymentIntentId,
          clientSecret: paymentIntent.clientSecret,
          metadata: {
            ticketId: createPaymentDto.ticketId,
            description: createPaymentDto.description,
          },
        },
      });

      this.logger.log(`✅ Pagamento registrado: ${payment.id}`);

      return {
        id: payment.id,
        clientSecret: paymentIntent.clientSecret,
        paymentIntentId: paymentIntent.paymentIntentId,
        amount: payment.amount,
      };
    } catch (error) {
      this.logger.error('❌ Erro ao criar pagamento:', error);
      throw error;
    }
  }

  async getPaymentStatus(paymentIntentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { paymentIntentId },
    });

    if (!payment) {
      return { status: 'NOT_FOUND' };
    }

    return {
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      customerEmail: payment.customerEmail,
      createdAt: payment.createdAt,
    };
  }

  async listPayments(customerEmail?: string) {
    const where = customerEmail ? { customerEmail } : {};
    
    const payments = await this.prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return payments;
  }
}
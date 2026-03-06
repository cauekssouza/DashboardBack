import { Controller, Post, Get, Body, Param, Query, HttpCode } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-pagamento.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create')
  @HttpCode(200)
  async createPayment(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.createPayment(createPaymentDto);
  }

  @Get('status/:paymentIntentId')
  async getPaymentStatus(@Param('paymentIntentId') paymentIntentId: string) {
    return this.paymentsService.getPaymentStatus(paymentIntentId);
  }

  @Get('list')
  async listPayments(@Query('email') email?: string) {
    return this.paymentsService.listPayments(email);
  }
}
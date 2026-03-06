import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { WebhooksController } from './webhooks.controller';
import { StripeService } from './stripe.service';
import { PrismaService } from '../../database/prisma.service';
import { SheetsGateway } from '../tickets/sheets/sheets.gateway';

@Module({
  controllers: [PaymentsController, WebhooksController],
  providers: [PaymentsService, StripeService, PrismaService, SheetsGateway],
  exports: [PaymentsService],
})
export class PaymentsModule {}
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TicketsModule } from './modules/tickets/tickets.module';
import { MetricsModule } from './modules/tickets/metrics/metrics.module';
import { SheetsModule } from './modules/tickets/sheets/sheets.module';
import { FreshdeskModule } from './modules/freshdesk/freshdesk.module';
import { PaymentsModule } from './modules/pagamento/payments.module'; 
import { PrismaService } from './database/prisma.service';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    TicketsModule,
    MetricsModule,
    SheetsModule,
    FreshdeskModule,
    PaymentsModule, // 👈 ADICIONE AQUI
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SheetsService } from './sheets.service';
import { SheetsController } from './sheets.controller';
import { SheetsGateway } from './sheets.gateway';
import { TicketsModule } from '../tickets.module';

@Module({
  imports: [ScheduleModule.forRoot(), TicketsModule],
  controllers: [SheetsController],
  providers: [SheetsService, SheetsGateway],
  exports: [SheetsService, SheetsGateway],
})
export class SheetsModule {}
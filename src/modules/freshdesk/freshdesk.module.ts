import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { FreshdeskService } from './freshdesk.service';
import { FreshdeskController } from './freshdesk.controller';
import { PrismaService } from '../../database/prisma.service';
import { SheetsGateway } from '../tickets/sheets/sheets.gateway';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [FreshdeskController],
  providers: [FreshdeskService, PrismaService, SheetsGateway],
  exports: [FreshdeskService],
})
export class FreshdeskModule {}
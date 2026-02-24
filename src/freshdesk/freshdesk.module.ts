import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { FreshdeskController } from './freshdesk.controller';
import { FreshdeskService } from './freshdesk.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
  ],
  controllers: [FreshdeskController],
  providers: [FreshdeskService],
  exports: [FreshdeskService],
})
export class FreshdeskModule {}


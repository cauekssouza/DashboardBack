import { Controller, Post, Get, HttpCode } from '@nestjs/common';
import { FreshdeskService } from './freshdesk.service';

@Controller('freshdesk')
export class FreshdeskController {
  constructor(private readonly freshdeskService: FreshdeskService) {}

  @Post('sync')
  @HttpCode(200)
  async sync() {
    return this.freshdeskService.manualSync();
  }

  @Get('test')
  async test() {
    return this.freshdeskService.testConnection();
  }

  @Get('status')
  async status() {
    return {
      service: 'Freshdesk Integration',
      status: 'active',
      lastSync: new Date().toISOString(),
    };
  }
}
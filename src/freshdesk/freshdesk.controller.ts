import { Controller, Get, Param } from '@nestjs/common';
import { FreshdeskService } from './freshdesk.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('freshdesk')
export class FreshdeskController {
  constructor(private readonly freshdeskService: FreshdeskService) {}

  @Public()  
  @Get('dashboard/:clienteId')
  async getDashboard(@Param('clienteId') clienteId: string) {
    return this.freshdeskService.getDashboard(clienteId);
  }
}
// back/src/freshdesk/modules/configuracoes/configuracoes.controller.ts
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ConfiguracoesService } from './configuracoes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guards';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('freshdesk/configuracoes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConfiguracoesController {
  constructor(private readonly configuracoesService: ConfiguracoesService) {}

  @Get()
  async getConfiguracao() {
    return this.configuracoesService.getConfiguracao();
  }

  @Post()
  @Roles('ADMIN')
  async salvarConfiguracao(@Body() data: { subdominio: string; apiKey: string }) {
    return this.configuracoesService.salvarConfiguracao(data);
  }

  @Post('testar')
  @Roles('ADMIN')
  async testarConexao(@Body() data: { subdominio: string; apiKey: string }) {
    return this.configuracoesService.testarConexao(data);
  }

  @Post('sincronizar')
  @Roles('ADMIN', 'MANAGER')
  async sincronizar() {
    return this.configuracoesService.sincronizar();
  }
}
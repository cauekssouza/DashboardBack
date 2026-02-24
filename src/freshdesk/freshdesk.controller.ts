import { Controller, Get, Param, Query, HttpException, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { FreshdeskService, Periodo } from './freshdesk.service';

@Controller('freshdesk')
export class FreshdeskController {
  constructor(private readonly freshdeskService: FreshdeskService) {}

  @Get('dashboard/:clienteId')
  async getDashboard(
    @Param('clienteId') clienteId: string,
    @Query('periodo') periodo: string = '30d'
  ) {
    try {
      const periodoValido = this.validarPeriodo(periodo);
      const data = await this.freshdeskService.getDashboardCompleto(clienteId, periodoValido);
      return {
        success: true,
        data,
        periodo: periodoValido,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: 'Erro ao buscar dashboard',
        error: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('dashboard/:clienteId/resumo')
  async getDashboardResumido(
    @Param('clienteId') clienteId: string,
    @Query('periodo') periodo: string = '30d'
  ) {
    try {
      const periodoValido = this.validarPeriodo(periodo);
      const data = await this.freshdeskService.getDashboardResumido(clienteId, periodoValido);
      return {
        success: true,
        data,
        periodo: periodoValido,
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: 'Erro ao buscar resumo do dashboard',
        error: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('dashboard/:clienteId/metricas')
  async getMetricas(
    @Param('clienteId') clienteId: string,
    @Query('periodo') periodo: string = '30d'
  ) {
    try {
      const periodoValido = this.validarPeriodo(periodo);
      const data = await this.freshdeskService.getMetricas(clienteId, periodoValido);
      return {
        success: true,
        data,
        periodo: periodoValido,
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: 'Erro ao buscar métricas',
        error: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('dashboard/:clienteId/historico')
  async getHistorico(
    @Param('clienteId') clienteId: string,
    @Query('periodo') periodo: string = '30d',
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    try {
      const periodoValido = this.validarPeriodo(periodo);
      const data = await this.freshdeskService.getHistorico(clienteId, periodoValido, page, limit);
      return {
        success: true,
        data,
        periodo: periodoValido,
        pagination: { page, limit },
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: 'Erro ao buscar histórico',
        error: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('dashboard/:clienteId/alertas')
  async getAlertas(
    @Param('clienteId') clienteId: string,
    @Query('periodo') periodo: string = '30d'
  ) {
    try {
      const periodoValido = this.validarPeriodo(periodo);
      const data = await this.freshdeskService.getAlertas(clienteId, periodoValido);
      return {
        success: true,
        data,
        periodo: periodoValido,
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: 'Erro ao buscar alertas',
        error: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('dashboard/:clienteId/perfil')
  async getPerfil(@Param('clienteId') clienteId: string) {
    try {
      const data = await this.freshdeskService.getPerfilCliente(clienteId);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: 'Erro ao buscar perfil do cliente',
        error: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('dashboard/:clienteId/ticket-atual')
  async getTicketAtual(@Param('clienteId') clienteId: string) {
    try {
      const data = await this.freshdeskService.getTicketAtual(clienteId);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: 'Erro ao buscar ticket atual',
        error: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('dashboard/:clienteId/recomendacoes')
  async getRecomendacoes(
    @Param('clienteId') clienteId: string,
    @Query('periodo') periodo: string = '30d'
  ) {
    try {
      const periodoValido = this.validarPeriodo(periodo);
      const data = await this.freshdeskService.getRecomendacoes(clienteId, periodoValido);
      return {
        success: true,
        data,
        periodo: periodoValido,
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: 'Erro ao buscar recomendações',
        error: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('export/:clienteId')
  async exportDashboard(
    @Param('clienteId') clienteId: string,
    @Query('periodo') periodo: string = '30d',
    @Query('formato') formato: string = 'json',
    @Res() res: Response
  ) {
    try {
      const periodoValido = this.validarPeriodo(periodo);
      const data = await this.freshdeskService.getDashboardCompleto(clienteId, periodoValido);

      if (formato === 'csv') {
        const csv = this.freshdeskService.exportToCSV(data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=dashboard-${clienteId}-${periodo}.csv`);
        res.send(csv);
      } else if (formato === 'pdf') {
        // Retorna JSON que o frontend pode converter para PDF
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=dashboard-${clienteId}-${periodo}.json`);
        res.json(data);
      } else {
        res.json({
          success: true,
          data,
          periodo: periodoValido,
          exportedAt: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: 'Erro ao exportar dashboard',
        error: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Valida e converte o período recebido
   */
  private validarPeriodo(periodo: string): Periodo {
    const periodosValidos: Record<string, Periodo> = {
      '7d': Periodo.ULTIMOS_7_DIAS,
      '30d': Periodo.ULTIMOS_30_DIAS,
      '1m': Periodo.ULTIMO_MES,
      '3m': Periodo.ULTIMOS_3_MESES,
      '6m': Periodo.ULTIMOS_6_MESES,
      '1y': Periodo.ULTIMO_ANO,
    };
    
    return periodosValidos[periodo] || Periodo.ULTIMOS_30_DIAS;
  }
}


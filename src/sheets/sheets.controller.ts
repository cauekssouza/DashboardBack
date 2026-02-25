import { Controller, Get, Post, Query, HttpException, HttpStatus } from '@nestjs/common';
import { SheetsService } from './sheets.service';

@Controller('sheets')
export class SheetsController {
  constructor(private readonly sheetsService: SheetsService) {}

  @Get('fetch')
  async fetchFromGoogle() {
    try {
      const data = await this.sheetsService.fetchSheetData();
      return {
        success: true,
        message: 'Dados importados com sucesso',
        count: data.length,
        data: data,
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: 'Erro ao importar dados',
        error: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('imports')
  async getImports() {
    try {
      const imports = await this.sheetsService.getImports();
      return {
        success: true,
        data: imports,
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: 'Erro ao buscar importações',
        error: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('latest')
  async getLatest() {
    try {
      const data = await this.sheetsService.getLatest();
      return {
        success: true,
        data: data,
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: 'Erro ao buscar dados',
        error: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obter TODOS os dados brutos da planilha (sem processar)
   * Retorna todos os campos presentes na planilha
   */
  @Get('all')
  async getAllRawData(@Query('periodo') periodo: string = '30d') {
    try {
      const validPeriods = ['7d', '30d', '1m', '3m', '6m', '1y'];
      const validPeriod = validPeriods.includes(periodo) ? periodo : '30d';

      const data = await this.sheetsService.getAllRawData(validPeriod);
      
      return {
        success: true,
        periodo: validPeriod,
        count: data.length,
        data: data
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: 'Erro ao buscar dados',
        error: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obter métricas de desempenho por período
   * Períodos: 1m, 3m, 6m, 1y
   */
  @Get('performance')
  async getPerformance(@Query('periodo') periodo: string = '30d') {
    try {
      const validPeriods = ['7d', '30d', '1m', '3m', '6m', '1y'];
      const validPeriod = validPeriods.includes(periodo) ? periodo : '30d';

      const metrics = await this.sheetsService.getPerformanceMetrics(validPeriod);
      
      return {
        success: true,
        periodo: validPeriod,
        data: metrics
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: 'Erro ao buscar métricas de desempenho',
        error: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obter análise de lucratividade
   */
  @Get('profitability')
  async getProfitability(@Query('periodo') periodo: string = '30d') {
    try {
      const validPeriods = ['7d', '30d', '1m', '3m', '6m', '1y'];
      const validPeriod = validPeriods.includes(periodo) ? periodo : '30d';

      const analysis = await this.sheetsService.getProfitabilityAnalysis(validPeriod);
      
      return {
        success: true,
        periodo: validPeriod,
        data: analysis
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: 'Erro ao buscar análise de lucratividade',
        error: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obter tickets filtrados
   */
  @Get('tickets')
  async getTickets(
    @Query('periodo') periodo: string = '30d',
    @Query('urgente') urgente?: string,
    @Query('vip') vip?: string,
    @Query('especializado') especializado?: string,
    @Query('classificacao') classificacao?: string,
    @Query('scoreRisco') scoreRisco?: string,
    @Query('cancelou') cancelou?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const validPeriods = ['7d', '30d', '1m', '3m', '6m', '1y'];
      const validPeriod = validPeriods.includes(periodo) ? periodo : '30d';

      const filtros: any = {};
      
      if (urgente !== undefined) filtros.urgente = urgente === 'true';
      if (vip !== undefined) filtros.vip = vip === 'true';
      if (especializado !== undefined) filtros.especializado = especializado === 'true';
      if (classificacao) filtros.classificacao = classificacao;
      if (scoreRisco) filtros.scoreRisco = scoreRisco;
      if (cancelou !== undefined) filtros.cancelou = cancelou === 'true';
      if (status) filtros.status = status;
      if (limit) filtros.limit = parseInt(limit, 10);

      const tickets = await this.sheetsService.getFilteredTickets(validPeriod, filtros);
      
      return {
        success: true,
        periodo: validPeriod,
        count: tickets.length,
        data: tickets
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: 'Erro ao buscar tickets',
        error: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Exportar dados
   */
  @Get('export')
  async exportData(
    @Query('periodo') periodo: string = '30d',
    @Query('formato') formato: string = 'csv',
  ) {
    try {
      const validPeriods = ['7d', '30d', '1m', '3m', '6m', '1y'];
      const validPeriod = validPeriods.includes(periodo) ? periodo : '30d';

      if (formato === 'csv') {
        const csv = await this.sheetsService.exportToCSV(validPeriod);
        
        return {
          success: true,
          formato: 'csv',
          periodo: validPeriod,
          data: csv,
          contentType: 'text/csv'
        };
      }

      // Para JSON
      const tickets = await this.sheetsService.getFilteredTickets(validPeriod, {});
      const metrics = await this.sheetsService.getPerformanceMetrics(validPeriod);
      const profitability = await this.sheetsService.getProfitabilityAnalysis(validPeriod);

      return {
        success: true,
        periodo: validPeriod,
        exportedAt: new Date().toISOString(),
        metrics,
        profitability,
        tickets
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: 'Erro ao exportar dados',
        error: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Atualizar dados da planilha (forçar refresh)
   * Aceita tanto GET quanto POST
   */
  @Get('refresh')
  @Post('refresh')
  async refreshData(@Query('periodo') periodo: string = '30d') {
    try {
      const validPeriods = ['7d', '30d', '1m', '3m', '6m', '1y'];
      const validPeriod = validPeriods.includes(periodo) ? periodo : '30d';

      const data = await this.sheetsService.fetchAndProcessSheetData(validPeriod);
      
      return {
        success: true,
        message: 'Dados atualizados com sucesso',
        periodo: validPeriod,
        count: data.length
      };
    } catch (error: any) {
      throw new HttpException({
        success: false,
        message: 'Erro ao atualizar dados',
        error: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}


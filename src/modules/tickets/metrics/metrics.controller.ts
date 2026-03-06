import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Obter métricas para o dashboard' })
  @ApiQuery({ name: 'range', required: false, enum: ['7d', '15d', '30d', '90d'] })
  getDashboardMetrics(@Query('range') range: string = '30d') {
    return this.metricsService.getDashboardMetrics(range);
  }

  @Get('client')
  @ApiOperation({ summary: 'Obter resumo de um cliente por email' })
  @ApiQuery({ name: 'email', required: true })
  getClientSummary(@Query('email') email: string) {
    return this.metricsService.getClientSummary(email);
  }

  @Get('period')
  @ApiOperation({ summary: 'Obter métricas por período' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  getMetricsByPeriod(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.metricsService.getMetricsByPeriod(
      new Date(startDate),
      new Date(endDate),
    );
  }
}
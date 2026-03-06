import { Controller, Post, Get, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SheetsService } from './sheets.service';

@ApiTags('sheets')
@Controller('sheets')
export class SheetsController {
  constructor(private readonly sheetsService: SheetsService) {}

  @Post('sync')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sincronizar manualmente com Google Sheets' })
  async sync() {
    return this.sheetsService.manualSync();
  }

  @Get('info')
  @ApiOperation({ summary: 'Obter informações da planilha' })
  async getInfo() {
    return this.sheetsService.getSheetInfo();
  }

  @Get('fetch')
  @ApiOperation({ summary: 'Buscar dados da planilha (sem salvar)' })
  async fetch() {
    return this.sheetsService.fetchFromSheet();
  }
  @Get('diagnostic')
async diagnostic() {
  try {
    // Tentar sem especificar aba
    const result1 = await this.sheetsService.fetchFromSheet('A1:T5');
    
    // Tentar com nome exato
    const result2 = await this.sheetsService.fetchFromSheet('HISTÓRICO!A1:T5');
    
    return {
      semAba: {
        success: true,
        total: result1.length,
        sample: result1.slice(0, 2)
      },
      comAba: {
        success: true,
        total: result2.length,
        sample: result2.slice(0, 2)
      }
    };
  } catch (error) {
    return { error: error.message };
  }
}
}
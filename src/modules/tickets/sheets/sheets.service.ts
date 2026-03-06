import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { Cron } from '@nestjs/schedule';
import { TicketsService } from '../tickets.service';
import { SheetsGateway } from './sheets.gateway';
import { CreateTicketDto } from '../dto/create-ticket.dto';

@Injectable()
export class SheetsService {
  private readonly logger = new Logger(SheetsService.name);
  private sheets;
  private spreadsheetId!: string;
  private defaultRange: string;
  private lastSyncHash: string = '';

  constructor(
    private configService: ConfigService,
    private ticketsService: TicketsService,
    private sheetsGateway: SheetsGateway,
  ) {
    this.defaultRange = 'HISTÓRICO!A:AB'; // Agora vai até AB (28 colunas)
    this.initializeSheets();
  }

  private async initializeSheets() {
    try {
      const clientEmail = this.configService.get<string>('GOOGLE_CLIENT_EMAIL');
      const privateKey = this.configService.get<string>('GOOGLE_PRIVATE_KEY');
      const spreadsheetId = this.configService.get<string>('SPREADSHEET_ID');

      if (!clientEmail || !privateKey || !spreadsheetId) {
        this.logger.error('❌ Credenciais do Google Sheets não configuradas');
        return;
      }

      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      this.spreadsheetId = spreadsheetId;
      
      this.logger.log('✅ Google Sheets inicializado com sucesso');
      this.logger.log(`📊 Range configurado: ${this.defaultRange} (28 colunas A-AB)`);
      
      // Primeira sincronização
      this.syncWithSheet();
    } catch (error) {
      this.logger.error('❌ Erro ao inicializar Google Sheets:', error);
    }
  }

  @Cron('*/30 * * * * *') // A CADA 30 SEGUNDOS
  async syncWithSheet() {
    this.logger.log('🔄 Iniciando sincronização automática...');
    
    try {
      if (!this.sheets) {
        this.logger.error('❌ Google Sheets não inicializado');
        return { success: false, error: 'Sheets não inicializado' };
      }

      const tickets = await this.fetchFromSheet(this.defaultRange);
      
      if (!tickets || tickets.length === 0) {
        this.logger.warn('⚠️ Nenhum ticket encontrado');
        return { success: true, imported: 0, errors: 0, total: 0 };
      }

      // Verificar se houve mudanças reais
      const hasChanges = await this.hasRealChanges(tickets);
      
      if (!hasChanges) {
        this.logger.log('⏭️ Nenhuma mudança detectada, pulando sincronização');
        return { success: true, imported: 0, errors: 0, total: 0, skipped: true };
      }

      // Calcular hash dos dados
      const currentHash = this.calculateHash(tickets);
      
      this.logger.log(`📥 Processando ${tickets.length} tickets`);
      
      let imported = 0;
      let errors = 0;

      for (const ticket of tickets) {
        try {
          if (this.validateTicket(ticket)) {
            await this.ticketsService.upsertFromSheet(ticket);
            imported++;
          } else {
            errors++;
            this.logger.warn(`⚠️ Ticket ${ticket.ticketId} ignorado - dados inválidos`);
          }
        } catch (error) {
          errors++;
          this.logger.error(`❌ Erro no ticket ${ticket.ticketId}:`, error.message);
        }
      }

      this.logger.log(`✅ Sincronização: ${imported} importados, ${errors} erros`);
      
      // Se houve mudanças, notificar via WebSocket
      if (currentHash !== this.lastSyncHash) {
        this.logger.log('📢 Mudanças detectadas! Notificando clientes...');
        this.sheetsGateway.notifyUpdate({
          imported,
          errors,
          total: tickets.length,
          timestamp: new Date(),
        });
        this.lastSyncHash = currentHash;
      }
      
      return { success: true, imported, errors, total: tickets.length };
    } catch (error) {
      this.logger.error('❌ Erro na sincronização:', error);
      throw error;
    }
  }

  private async hasRealChanges(newTickets: CreateTicketDto[]): Promise<boolean> {
    try {
      if (!newTickets || newTickets.length === 0) {
        return false;
      }

      const lastTickets = await this.ticketsService.findAll({ limit: 10 });
      
      if (!lastTickets.data || lastTickets.data.length === 0) {
        return true; // Primeira importação
      }
      
      // Comparar apenas os IDs (mais simples e seguro)
      const lastIds = lastTickets.data.slice(0, 5).map(t => t.ticketId).join(',');
      const newIds = newTickets.slice(0, 5).map(t => t.ticketId).join(',');
      
      return lastIds !== newIds;
    } catch (error) {
      this.logger.error('Erro ao verificar mudanças:', error);
      return true;
    }
  }

  private calculateHash(tickets: any[]): string {
    const str = JSON.stringify(tickets.map(t => t.ticketId + t.timestamp));
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  private validateTicket(ticket: CreateTicketDto): boolean {
    if (!ticket.ticketId || ticket.ticketId <= 0) return false;
    if (!ticket.timestamp || ticket.timestamp === 'Invalid Date') return false;
    if (!ticket.email || ticket.email === '0' || ticket.email === '') return false;
    return true;
  }

  async fetchFromSheet(range: string = this.defaultRange) {
    try {
      if (!this.sheets || !this.spreadsheetId) {
        this.logger.error('❌ Google Sheets não inicializado');
        return [];
      }

      this.logger.log(`📥 Buscando dados do range: ${range}`);
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range,
        valueRenderOption: 'UNFORMATTED_VALUE',
      });

      const rows = response.data.values;
      
      // 🔍 LOG CRÍTICO - Mostra o que veio da planilha
      this.logger.log('🔍 RESPOSTA COMPLETA DA API:');
      this.logger.log(`Total de linhas: ${rows?.length || 0}`);
      
      if (rows && rows.length > 0) {
        this.logger.log('Primeira linha (cabeçalho):', JSON.stringify(rows[0]));
        if (rows.length > 1) {
          this.logger.log('Segunda linha (primeiro dado):', JSON.stringify(rows[1]));
        }
      } else {
        this.logger.warn('⚠️ rows está vazio ou undefined');
        this.logger.log('Resposta completa:', JSON.stringify(response.data));
      }
      
      if (!rows || rows.length === 0) {
        this.logger.warn('⚠️ Nenhum dado encontrado');
        return [];
      }

      // Pular cabeçalho (primeira linha)
      const data = rows.slice(1);
      
      this.logger.log(`📈 Processando ${data.length} linhas de dados`);
      
      // Alerta se a planilha estiver grande
      if (data.length > 5000) {
        this.logger.warn(`⚠️ Planilha muito grande: ${data.length} linhas! Considere arquivar dados antigos.`);
      }
      
      const tickets = data
        .map((row, index) => {
          try {
            return this.mapSheetRowToTicket(row, index + 2);
          } catch (error) {
            this.logger.error(`Erro ao mapear linha ${index + 2}:`, error);
            return null;
          }
        })
        .filter(ticket => ticket !== null && ticket.ticketId > 0);

      this.logger.log(`✅ ${tickets.length} tickets válidos encontrados`);
      
      return tickets;
    } catch (error) {
      this.logger.error('❌ Erro ao buscar dados:', error);
      return [];
    }
  }

  private mapSheetRowToTicket(row: any[], rowNumber: number): CreateTicketDto | null {
    try {
      // Colunas A a T (0-19) - já existentes
      const timestamp = this.parseDate(row[0]);
      const ticketId = this.parseNumber(row[1]);
      const nome = row[2]?.toString().trim() || 'Nome não informado';
      const email = this.parseEmail(row[3]);
      const assunto = row[4]?.toString().trim() || null;
      const totalTickets = this.parseNumber(row[5]);
      const urgente = this.parseSimNao(row[6]);
      const vip = this.parseSimNao(row[7]);
      const especializado = this.parseSimNao(row[8]);
      const scoreRisco = this.parseScoreRisco(row[9]);
      const recorrencia = this.parseRecorrencia(row[10]);
      const classificacao = row[11]?.toString().trim() || 'NOVO';
      const recomendacao = row[12]?.toString().trim() || 'Atendimento padrão';
      const cancelouAntes = this.parseSimNao(row[13]);
      const precisouIntegracao = this.parseSimNao(row[14]);
      const problemaPagamento = row[15]?.toString().trim() || null;
      const clienteDesde = this.parseDate(row[16]);
      const diasComoCliente = this.parseNumber(row[17]);
      const status = row[18]?.toString().trim() || 'Open';
      const prazo = this.parseDate(row[19]);

      // 🔥 NOVAS COLUNAS (U a AB - índices 20 a 27)
      const idConversa = row[20]?.toString().trim() || null;
      const chat = row[21]?.toString().trim() || null;
      const mensagens = row[22]?.toString().trim() || null;
      const categoria = row[23]?.toString().trim() || null;
      const pilar = row[24]?.toString().trim() || null;
      const confianca = row[25] ? this.parseNumber(row[25]) : undefined;
      const acao = row[26]?.toString().trim() || null;
      const source = row[27]?.toString().trim() || null;

      if (!ticketId || ticketId <= 0) return null;
      if (!timestamp) return null;
      if (!email || email === '0') return null;

      return {
        timestamp: timestamp.toISOString(),
        ticketId,
        nome,
        email,
        assunto,
        totalTickets,
        urgente,
        vip,
        especializado,
        scoreRisco,
        recorrencia,
        classificacao,
        recomendacao,
        cancelouAntes,
        precisouIntegracao,
        problemaPagamento: problemaPagamento || undefined,
        clienteDesde: clienteDesde?.toISOString(),
        diasComoCliente,
        status,
        prazo: prazo?.toISOString(),
        // 🔥 NOVOS CAMPOS
        idConversa,
        chat,
        mensagens,
        categoria,
        pilar,
        confianca,
        acao,
        source,
      };
    } catch (error) {
      this.logger.error(`Erro ao mapear linha ${rowNumber}:`, error);
      return null;
    }
  }

  private parseDate(value: any): Date | null {
    if (!value) return null;
    
    try {
      if (typeof value === 'number') {
        const excelEpoch = new Date(1900, 0, 1);
        const days = value - 1;
        const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
        return isNaN(date.getTime()) ? null : date;
      }
      
      if (typeof value === 'string') {
        value = value.trim();
        if (value === '') return null;
        
        const date = new Date(value);
        if (!isNaN(date.getTime())) return date;
        
        const parts = value.split(/[\/\-]/);
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1;
          const year = parseInt(parts[2]);
          const date = new Date(year, month, day);
          if (!isNaN(date.getTime())) return date;
        }
      }
    } catch (error) {
      this.logger.debug(`Erro ao parsear data: ${value}`);
    }
    
    return null;
  }

  private parseNumber(value: any): number {
    if (!value) return 0;
    
    try {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
      }
    } catch (error) {
      this.logger.debug(`Erro ao parsear número: ${value}`);
    }
    
    return 0;
  }

  private parseEmail(value: any): string {
    if (!value) return 'email@nao.informado';
    
    const email = value.toString().trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(email)) return email;
    
    return 'email@nao.informado';
  }

  private parseSimNao(value: any): 'SIM' | 'NÃO' {
    if (!value) return 'NÃO';
    const str = value.toString().trim().toUpperCase();
    return str === 'SIM' ? 'SIM' : 'NÃO';
  }

  private parseScoreRisco(value: any): 'ALTO' | 'MEDIO' | 'BAIXO' {
    if (!value) return 'BAIXO';
    const str = value.toString().trim().toUpperCase();
    if (str.includes('ALTO')) return 'ALTO';
    if (str.includes('MEDIO') || str.includes('MÉDIO')) return 'MEDIO';
    return 'BAIXO';
  }

  private parseRecorrencia(value: any): 'ALTA' | 'MEDIA' | 'BAIXA' {
    if (!value) return 'BAIXA';
    const str = value.toString().trim().toUpperCase();
    if (str.includes('ALTA')) return 'ALTA';
    if (str.includes('MEDIA') || str.includes('MÉDIA')) return 'MEDIA';
    return 'BAIXA';
  }

  async getSheetInfo() {
    try {
      if (!this.sheets || !this.spreadsheetId) {
        throw new Error('Google Sheets não inicializado');
      }

      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      return {
        title: response.data.properties?.title,
        sheets: response.data.sheets?.map(sheet => ({
          title: sheet.properties?.title,
          rowCount: sheet.properties?.gridProperties?.rowCount,
          columnCount: sheet.properties?.gridProperties?.columnCount,
        })) || [],
      };
    } catch (error) {
      this.logger.error('❌ Erro ao obter informações:', error);
      throw error;
    }
  }

  async manualSync() {
    this.logger.log('👤 Sincronização manual iniciada');
    return this.syncWithSheet();
  }
}
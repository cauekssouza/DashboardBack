import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SheetsService {
  private readonly logger = new Logger(SheetsService.name);
  private readonly SPREADSHEET_ID = '2PACX-1vSi5wZfoSCK6kCuMrBb9Ol48IgDQVPzisYS9Es-uOf5FGfFZoZAZ9gljpCSz_KHHFKZB8MhRa0cisrp';
  private readonly SHEET_NAME = 'DASHBOARD'; // Aba padrão
  private readonly SHEET_NAMES: Record<string, string> = {
    '7d': '7d',
    '30d': 'DASHBOARD',
    '1m': '1m',
    '3m': '3m',
    '6m': '6m',
    '1y': '1y',
  };
  private readonly REFRESH_INTERVAL = 30000; // 30 segundos
  private readonly CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
  
  private auth: any = null;
  private sheets: any = null;

  constructor(private prisma: PrismaService) {
    this.initializeGoogleSheets();
    this.logger.log('✅ Planilha configurada com Service Account');
    this.logger.log(`📊 Spreadsheet ID: ${this.SPREADSHEET_ID}`);
    this.logger.log(`📧 Service Account: dashboard-servi-o@dashboard-freshdesk.iam.gserviceaccount.com`);
    
    // Iniciar atualização automática
    this.startAutoRefresh();
  }

  /**
   * Inicializar autenticação com Google Service Account
   */
  private async initializeGoogleSheets() {
    try {
      // Carregar credenciais do arquivo
      const credentials = JSON.parse(fs.readFileSync(this.CREDENTIALS_PATH, 'utf-8'));
      
      // Criar autenticação JWT com service account usando fromJSON
      this.auth = google.auth.fromJSON(credentials);
      this.auth.scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

      // Criar cliente da API do Google Sheets
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      this.logger.log('✅ Autenticação Google Sheets inicializada');
    } catch (error: any) {
      this.logger.error('❌ Erro ao inicializar Google Sheets:', error.message);
      throw error;
    }
  }

  /**
   * Atualização automática em background
   */
  private startAutoRefresh() {
    setInterval(async () => {
      try {
        await this.fetchAndProcessSheetData();
        this.logger.log('🔄 Dados atualizados automaticamente');
      } catch (error: any) {
        this.logger.error('❌ Erro na atualização automática:', error.message);
      }
    }, this.REFRESH_INTERVAL);
  }

  /**
   * Buscar dados da planilha e processar
   */
  async fetchAndProcessSheetData(periodo: string = '30d') {
    try {
      this.logger.log(`📥 Buscando dados da planilha para período: ${periodo}`);
      
      const sheetName = this.SHEET_NAMES[periodo] || this.SHEET_NAME;
      
      // Verificar se o cliente sheets está disponível
      if (!this.sheets) {
        await this.initializeGoogleSheets();
      }

      // Buscar dados da planilha usando a API autenticada
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.SPREADSHEET_ID,
        range: sheetName,
      });

      const rows = response.data.values;
      
      if (!rows || rows.length === 0) {
        this.logger.warn('⚠️ Nenhum dado encontrado na planilha');
        return [];
      }

      // Converter array de arrays para CSV string para reuse do parser existente
      const csvText = this.arrayToCSV(rows);
      const rawData = this.parseCSV(csvText);

      if (rawData.length === 0) {
        this.logger.warn('⚠️ Nenhum dado válido encontrado após parse');
        return [];
      }

      this.logger.log(`✅ Encontrados ${rawData.length} registros brutos`);

      // Processar e salvar dados estruturados
      const ticketData = this.processTicketData(rawData, periodo);
      
      // Salvar no banco
      await this.prisma.client.sheetImport.create({
        data: {
          data: rawData,
          source: 'google_sheets_api',
        },
      });

      // Salvar dados estruturados
      if (ticketData.length > 0) {
        // Limpar dados anteriores deste período
        await this.prisma.client.ticketData.deleteMany({
          where: { periodo }
        });
        
        // Inserir novos dados
        await this.prisma.client.ticketData.createMany({
          data: ticketData
        });

        // Recalcular métricas
        await this.calculatePerformanceMetrics(periodo);
        await this.calculateProfitabilityAnalysis(periodo);
      }

      this.logger.log(`✅ ${ticketData.length} tickets processados e salvos`);
      return ticketData;

    } catch (error: any) {
      this.logger.error('❌ Erro ao buscar dados:', error.message);
      // Fallback: tentar método público se API falhar
      this.logger.log('🔄 Tentando método público como fallback...');
      return this.fetchAndProcessSheetDataPublic(periodo);
    }
  }

  /**
   * Buscar dados da planilha via Google Sheets API (autenticado) - método original
   */
  async fetchSheetData() {
    return this.fetchAndProcessSheetData('30d');
  }

  /**
   * Converter array de arrays para formato CSV
   */
  private arrayToCSV(rows: any[][]): string {
    return rows.map(row => 
      row.map(cell => {
        // Se a célula contém vírgula ou aspas, envolver em aspas
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');
  }

  /**
   * Fallback: Buscar dados da planilha pública via CSV (método original)
   */
  private async fetchAndProcessSheetDataPublic(periodo: string = '30d') {
    try {
      this.logger.log('📥 Buscando dados da planilha pública (fallback)...');
      
      const sheetName = this.SHEET_NAMES[periodo] || this.SHEET_NAME;
      const csvUrl = `https://docs.google.com/spreadsheets/d/e/${this.SPREADSHEET_ID}/pub?output=csv&sheet=${sheetName}`;
      
      const response = await axios.get(csvUrl, {
        timeout: 15000,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const csvText = response.data;
      const rawData = this.parseCSV(csvText);

      if (rawData.length === 0) {
        this.logger.warn('⚠️ Nenhum dado encontrado na planilha');
        return [];
      }

      this.logger.log(`✅ Encontrados ${rawData.length} registros (público)`);

      // Salvar no banco
      await this.prisma.client.sheetImport.create({
        data: {
          data: rawData,
          source: 'google_sheets_public',
        },
      });

      // Processar dados estruturados
      const ticketData = this.processTicketData(rawData, periodo);
      
      if (ticketData.length > 0) {
        await this.prisma.client.ticketData.deleteMany({
          where: { periodo }
        });
        await this.prisma.client.ticketData.createMany({
          data: ticketData
        });
        await this.calculatePerformanceMetrics(periodo);
        await this.calculateProfitabilityAnalysis(periodo);
      }

      return ticketData;

    } catch (error: any) {
      this.logger.error('❌ Erro no fallback público:', error.message);
      throw error;
    }
  }

  /**
   * Processar dados brutos em dados estruturados de ticket
   * Mapeia os campos da planilha para o formato correto
   */
  private processTicketData(rawData: any[], periodo: string): any[] {
    const tickets: any[] = [];
    
    for (const data of rawData) {
      try {
        // Debug: mostrar os campos disponíveis
        this.logger.debug(`Processando registro com campos: ${Object.keys(data).join(', ')}`);
        
        // Mapeamento de campos da planilha
        // A planilha tem formato: "Flag Urgente:,SIM" → normalizado para "flag_urgente"
        const timestamp = this.parseDate(data.timestamp || data.criado_em || data.criadoem);
        const ticketId = this.parseIntSafe(data.id || data.ticket_id || data.ticketid);
        
        // Campos com nomes variados na planilha
        const totalTickets = this.parseIntSafe(
          data.total_tickets || 
          data.totaltickets || 
          data.total_de_tickets ||
          data.total
        );
        
        // Flags - verificar diferentes variações
        const urgente = this.parseBool(data.flag_urgente || data.urgente || data.flagurgente);
        const vip = this.parseBool(data.flag_vip || data.vip || data.flagvip);
        const especializado = this.parseBool(data.flag_especializado || data.especializado || data.flagespecializado);
        const cancelou = this.parseBool(data.ja_cancelou_antes || data.cancelou || data.jacancelouantes);
        const integracao = this.parseBool(data.precisou_integracao || data.integracao || data.precisouintegracao);
        const problemaPagamento = this.parseBool(data.problema_pagamento || data.problemapagamento || data.pagamento);
        
        // Scores e classificações
        const scoreRisco = data.score_risco || data.scorerisco || data.risco || null;
        const scoreRecorrencia = data.score_recorrencia || data.score_recorrencia || data.recorrencia || null;
        const classificacao = data.classificacao || null;
        const recomendacao = data.recomendacao || data.acao_sugerida || data.acaosugerida || null;
        
        // Dados do cliente
        const clienteDesde = this.parseDate(data.cliente_desde || data.clientedesde || data.cliente_desde);
        const diasCliente = this.parseIntSafe(
          data.dias_cliente || 
          data.diascliente || 
          data.dias_como_cliente || 
          data.tempo_como_cliente
        );
        
        // Status e prazo
        const status = data.status || data.status_do_ticket || null;
        const prazo = this.parseDate(data.prazo || data.prazo_final || data.prazofinal || data.prazo_fr);
        
        // Skip registro se não tiver dados úteis
        if (!ticketId && !totalTickets && !urgente && !vip && !classificacao) {
          continue;
        }
        
        tickets.push({
          timestamp: timestamp || new Date(),
          ticketId,
          nome: data.nome || data.cliente || null,
          email: data.email || null,
          assunto: data.assunto || data.tipo || null,
          totalTickets,
          urgente,
          vip,
          especializado,
          scoreRisco,
          scoreRecorrencia,
          classificacao,
          recomendacao,
          cancelou,
          integracao,
          problemaPagamento,
          clienteDesde,
          diasCliente,
          status,
          prazo,
          periodo,
          source: 'google_sheets'
        });
        
        this.logger.debug(`Ticket processado: ID=${ticketId}, Urgente=${urgente}, VIP=${vip}`);
      } catch (error: any) {
        this.logger.warn(`⚠️ Erro ao processar ticket: ${error.message}`);
      }
    }

    this.logger.log(`✅ Processados ${tickets.length} tickets válidos`);
    return tickets;
  }

  /**
   * Parse boolean de várias formas
   */
  private parseBool(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (!value) return false;
    const str = String(value).toLowerCase().trim();
    return str === 'sim' || str === 'yes' || str === 'true' || str === '1' || str.includes('sim');
  }

  /**
   * Calcular métricas de desempenho por período
   */
  async calculatePerformanceMetrics(periodo: string) {
    const tickets = await this.prisma.client.ticketData.findMany({
      where: { periodo }
    });

    if (tickets.length === 0) {
      return null;
    }

    const totalTickets = tickets.length;
    const ticketsAbertos = tickets.filter(t => t.status === 'Open' || t.status === '2').length;
    const ticketsFechados = totalTickets - ticketsAbertos;
    const ticketsUrgentes = tickets.filter(t => t.urgente).length;
    const ticketsVIP = tickets.filter(t => t.vip).length;
    const ticketsEspecializados = tickets.filter(t => t.especializado).length;
    const taxaResolucao = totalTickets > 0 ? (ticketsFechados / totalTickets) * 100 : 0;
    const taxaCancelamento = totalTickets > 0 ? (tickets.filter(t => t.cancelou).length / totalTickets) * 100 : 0;
    
    // Calcular clientes únicos
    const uniqueEmails = new Set(tickets.filter(t => t.email).map(t => t.email));
    const clientesTotal = uniqueEmails.size;
    const clientesNovos = tickets.filter(t => t.diasCliente <= 30).length;
    
    const scoreRiscoAlto = tickets.filter(t => t.scoreRisco === 'ALTO').length;
    const scoreRecorrenciaAlta = tickets.filter(t => t.scoreRecorrencia === 'ALTA').length;

    const metrics = {
      periodo,
      totalTickets,
      ticketsAbertos,
      ticketsFechados,
      ticketsUrgentes,
      ticketsVIP,
      ticketsEspecializados,
      taxaResolucao: Math.round(taxaResolucao * 100) / 100,
      tempoMedioResposta: 0, // Precisa de dados de timestamp para calcular
      taxaCancelamento: Math.round(taxaCancelamento * 100) / 100,
      clientesTotal,
      clientesNovos,
      scoreRiscoAlto,
      scoreRecorrenciaAlta
    };

    // Upsert metrics
    await this.prisma.client.performanceMetrics.upsert({
      where: { periodo },
      update: metrics,
      create: { ...metrics, id: undefined }
    });

    this.logger.log(`✅ Métricas calculadas para período ${periodo}:`, metrics);
    return metrics;
  }

  /**
   * Calcular análise de lucratividade
   * Lógica: 
   * - Clientes VIP são lucrativos (retorno esperado maior)
   * - Clientes com alto score de risco e recorrência são menos lucrativos (mais trabalho)
   * - Clientes que cancelaram e têm muitos tickets são não lucrativos
   * - Clientes especializados são lucrativos (serviço premium)
   */
  async calculateProfitabilityAnalysis(periodo: string) {
    const tickets = await this.prisma.client.ticketData.findMany({
      where: { periodo }
    });

    if (tickets.length === 0) {
      return null;
    }

    // Agrupar por cliente (email)
    const clientMap = new Map<string, any>();
    for (const ticket of tickets) {
      if (!ticket.email) continue;
      if (!clientMap.has(ticket.email)) {
        clientMap.set(ticket.email, {
          email: ticket.email,
          tickets: 0,
          urgente: false,
          vip: false,
          especializado: false,
          cancelou: false,
          riscoAlto: false,
          recorrenciaAlta: false
        });
      }
      const client = clientMap.get(ticket.email);
      client.tickets++;
      if (ticket.urgente) client.urgente = true;
      if (ticket.vip) client.vip = true;
      if (ticket.especializado) client.especializado = true;
      if (ticket.cancelou) client.cancelou = true;
      if (ticket.scoreRisco === 'ALTO') client.riscoAlto = true;
      if (ticket.scoreRecorrencia === 'ALTA') client.recorrenciaAlta = true;
    }

    const clients = Array.from(clientMap.values());
    const totalClientes = clients.length;

    // Classificar lucratividade
    let clientesLucrativos = 0;
    let clientesNaoLucrativos = 0;
    
    for (const client of clients) {
      // Cliente lucrativo: VIP OU especializado OU (não urgente E não risco alto E não cancelou)
      // Cliente não lucrativo: urgente E risco alto OU cancelou E muitos tickets
      const isLucrativo = 
        client.vip || 
        client.especializado || 
        (!client.urgente && !client.riscoAlto && !client.cancelou);
      
      if (isLucrativo) {
        clientesLucrativos++;
      } else {
        clientesNaoLucrativos++;
      }
    }

    const ticketsUrgentes = tickets.filter(t => t.urgente).length;
    const ticketsVIP = tickets.filter(t => t.vip).length;
    
    // Calcular taxa de esforço (tickets urgentes / tickets totais)
    const taxaEsforco = totalClientes > 0 ? (ticketsUrgentes / tickets.length) * 100 : 0;
    
    // Score médio (inverso do risco)
    const scoreMedio = clients.length > 0 
      ? clients.reduce((acc, c) => acc + (c.vip ? 100 : c.especializado ? 80 : 50), 0) / clients.length 
      : 0;

    const analysis = {
      periodo,
      totalClientes,
      clientesLucrativos,
      clientesNaoLucrativos,
      ticketsTotal: tickets.length,
      ticketsUrgentes,
      ticketsVIP,
      taxaEsforco: Math.round(taxaEsforco * 100) / 100,
      custoEstimado: tickets.length * 10, // Custo estimado por ticket
      scoreMedio: Math.round(scoreMedio * 100) / 100
    };

    await this.prisma.client.profitabilityAnalysis.upsert({
      where: { periodo },
      update: analysis,
      create: { ...analysis, id: undefined }
    });

    this.logger.log(`✅ Análise de lucratividade calculada para período ${periodo}:`, analysis);
    return analysis;
  }

  /**
   * Obter métricas de desempenho
   */
  async getPerformanceMetrics(periodo: string) {
    let metrics = await this.prisma.client.performanceMetrics.findUnique({
      where: { periodo }
    });

    // Se não existir, calcular
    if (!metrics) {
      await this.fetchAndProcessSheetData(periodo);
      metrics = await this.prisma.client.performanceMetrics.findUnique({
        where: { periodo }
      });
    }

    return metrics;
  }

  /**
   * Obter análise de lucratividade
   */
  async getProfitabilityAnalysis(periodo: string) {
    let analysis = await this.prisma.client.profitabilityAnalysis.findUnique({
      where: { periodo }
    });

    // Se não existir, calcular
    if (!analysis) {
      await this.fetchAndProcessSheetData(periodo);
      analysis = await this.prisma.client.profitabilityAnalysis.findUnique({
        where: { periodo }
      });
    }

    return analysis;
  }

  /**
   * Obter dados de tickets filtrados
   */
  async getFilteredTickets(periodo: string, filtros: any = {}) {
    let where: any = { periodo };

    if (filtros.urgente !== undefined) where.urgente = filtros.urgente;
    if (filtros.vip !== undefined) where.vip = filtros.vip;
    if (filtros.especializado !== undefined) where.especializado = filtros.especializado;
    if (filtros.classificacao) where.classificacao = filtros.classificacao;
    if (filtros.scoreRisco) where.scoreRisco = filtros.scoreRisco;
    if (filtros.cancelou !== undefined) where.cancelou = filtros.cancelou;
    if (filtros.status) where.status = filtros.status;

    return this.prisma.client.ticketData.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filtros.limit || 100
    });
  }

  /**
   * Exportar dados para CSV
   */
  async exportToCSV(periodo: string) {
    const tickets = await this.prisma.client.ticketData.findMany({
      where: { periodo }
    });

    if (tickets.length === 0) {
      return 'Nenhum dado para exportar';
    }

    const headers = [
      'timestamp', 'ticketId', 'nome', 'email', 'assunto', 'totalTickets',
      'urgente', 'vip', 'especializado', 'scoreRisco', 'scoreRecorrencia',
      'classificacao', 'cancelou', 'integracao', 'problemaPagamento',
      'clienteDesde', 'diasCliente', 'status', 'prazo'
    ];

    const rows = tickets.map(t => [
      t.timestamp?.toISOString() || '',
      t.ticketId || '',
      t.nome || '',
      t.email || '',
      t.assunto || '',
      t.totalTickets || 0,
      t.urgente ? 'SIM' : 'NÃO',
      t.vip ? 'SIM' : 'NÃO',
      t.especializado ? 'SIM' : 'NÃO',
      t.scoreRisco || '',
      t.scoreRecorrencia || '',
      t.classificacao || '',
      t.cancelou ? 'SIM' : 'NÃO',
      t.integracao ? 'SIM' : 'NÃO',
      t.problemaPagamento ? 'SIM' : 'NÃO',
      t.clienteDesde?.toISOString() || '',
      t.diasCliente || 0,
      t.status || '',
      t.prazo?.toISOString() || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Parsear CSV
   * O formato da planilha é: Label:,Valor,Label:,Valor
   * Exemplo: "Flag Urgente:,SIM ⚠️,Score Risco:,ALTO"
   */
  private parseCSV(csvText: string): any[] {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const results: any[] = [];
    
    // Processar cada linha
    for (let i = 0; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      
      // Formato: Label:,Valor,Label:,Valor
      // Cada par de colunas (índice par, índice ímpar) = Label, Valor
      const result: any = {};
      for (let j = 0; j + 1 < values.length; j += 2) {
        let label = values[j]?.trim();
        let value = values[j + 1]?.trim();
        
        // Se o label termina com ":", remover para normalizar
        if (label && label.endsWith(':')) {
          label = label.slice(0, -1);
        }
        
        // Pular linhas vazias ou apenas com emojis/títulos de seção
        if (label && value && 
            !label.startsWith('🚨') && 
            !label.startsWith('💡') && 
            !label.startsWith('👤') &&
            !label.startsWith('📋') && 
            !label.startsWith('📊') &&
            !label.startsWith('🎫') && 
            !label.startsWith('📝') &&
            label !== '') {
          const key = this.normalizeHeader(label);
          result[key] = value;
        }
      }

      if (Object.keys(result).length > 0) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Parsear uma linha CSV (lida com aspas)
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  private normalizeHeader(header: string): string {
    return header
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  private parseDate(dateStr: string | Date | null): Date | null {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  private parseIntSafe(value: any): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const parsed = parseInt(String(value).replace(/[^0-9]/g, ''), 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  async getImports() {
    return this.prisma.client.sheetImport.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  /**
   * Obter dados mais recentes
   */
  async getLatest() {
    const latest = await this.prisma.client.sheetImport.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    return latest?.data || [];
  }

  /**
   * Obter TODOS os dados brutos da planilha (sem processar)
   * Retorna todos os campos exatamente como estão na planilha
   */
  async getAllRawData(periodo: string): Promise<any> {
    try {
      // Primeiro, buscar dados frescos da planilha
      await this.fetchAndProcessSheetData(periodo);
      
      // Depois, retornar os dados brutos
      const latest = await this.prisma.client.sheetImport.findFirst({
        orderBy: { createdAt: 'desc' },
      });
      
      return latest?.data || [];
    } catch (error: any) {
      this.logger.error('❌ Erro ao buscar dados brutos:', error.message);
      throw error;
    }
  }
}


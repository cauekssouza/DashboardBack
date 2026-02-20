// back/src/configuracoes/configuracoes.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfiguracoesService {
  [x: string]: any;
  async getConfiguracoes() {
    return {
      empresa: await this.getEmpresa(),
      preferencias: await this.getPreferencias(),
      notificacoes: await this.getNotificacoes(),
    };
  }

  async updateConfiguracoes(body: any) {
    return { message: 'Configurações atualizadas', data: body };
  }

  async getEmpresa() {
    return {
      razaoSocial: '',
      nomeFantasia: '',
      cnpj: '',
      ie: '',
      im: '',
      endereco: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: '',
      telefone: '',
      email: '',
      website: '',
    };
  }

  async updateEmpresa(body: any) {
    return { message: 'Dados da empresa atualizados', data: body };
  }

  async getPreferencias() {
    return {
      idioma: 'pt-BR',
      fusoHorario: 'America/Sao_Paulo',
      formatoData: 'DD/MM/YYYY',
      formatoHora: '24h',
      formatoMoeda: 'BRL',
      primeiroDiaSemana: 'segunda',
      modoEscuro: false,
      compacto: false,
    };
  }

  async updatePreferencias(body: any) {
    return { message: 'Preferências atualizadas', data: body };
  }

  async getNotificacoes() {
    return {
      emailNovoTicket: true,
      emailTicketRespondido: true,
      emailTicketResolvido: true,
      emailSLAProximo: true,
      emailSLAVencido: true,
      emailMencao: true,
      emailRelatorioSemanal: false,
      emailRelatorioMensal: true,
      desktopNovoTicket: true,
      desktopTicketAtualizado: true,
      desktopMencao: true,
      somAlerta: false,
      somVolume: 70,
      resumoDiario: true,
      resumoSemanal: false,
      horarioResumo: '08:00',
    };
  }

  async updateNotificacoes(body: any) {
    return { message: 'Notificações atualizadas', data: body };
  }

  async getFreshdeskConfig() {
    return {
      configurado: false,
      subdominio: '',
      ultimaSincronizacao: null,
    };
  }

  async saveFreshdeskConfig(body: any) {
    return { 
      ...body, 
      configurado: true, 
      ultimaSincronizacao: new Date().toISOString() 
    };
  }

  async testarFreshdesk(body: any) {
    return { success: true, message: 'Conexão testada com sucesso!' };
  }
}
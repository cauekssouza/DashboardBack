// back/src/freshdesk/shared/enums/freshdesk.enums.ts
export enum ScoreRisco {
  ALTO = 'ALTO',
  MEDIO = 'MÉDIO',
  BAIXO = 'BAIXO'
}

export enum ScoreRecorrencia {
  ALTA = 'ALTA',
  MEDIA = 'MÉDIA',
  BAIXA = 'BAIXA'
}

export enum ClassificacaoCliente {
  VIP = 'VIP',
  RECORRENTE = 'RECORRENTE',
  OCASIONAL = 'OCASIONAL',
  NOVO = 'NOVO',
  COMUM = 'COMUM'
}

export enum StatusTicket {
  ABERTO = 2,
  PENDENTE = 3,
  RESOLVIDO = 4,
  FECHADO = 5
}

export enum PrioridadeTicket {
  BAIXA = 1,
  MEDIA = 2,
  ALTA = 3,
  URGENTE = 4
}

export enum TipoTicket {
  SOLICITACAO = 'Solicitação',
  CANCELAMENTO = 'Cancelamento',
  INTEGRACAO = 'Integração',
  DUVIDA = 'Dúvida',
  RECLAMACAO = 'Reclamação',
  LEAD = 'Lead'
}
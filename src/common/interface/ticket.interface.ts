export interface TicketData {
  timestamp: Date;
  ticketId: number;
  nome: string;
  email: string;
  assunto?: string;
  totalTickets: number;
  urgente: string;
  vip: string;
  especializado: string;
  scoreRisco: string;
  recorrencia: string;
  classificacao: string;
  recomendacao: string;
  cancelouAntes: string;
  precisouIntegracao: string;
  problemaPagamento?: string;
  clienteDesde?: Date;
  diasComoCliente: number;
  status: string;
  prazo?: Date;
  idConversa?: string;
  chat?: string;
  mensagens?: string;
  categoria?: string;
  pilar?: string;
  confianca?: number;
  acao?: string;
  source?: string;
}

export interface DashboardMetrics {
  totalTickets: number;
  ticketsAbertos: number;
  ticketsFechados: number;
  ticketsUrgentes: number;
  ticketsVIP: number;
  ticketsPorStatus: Record<string, number>;
  ticketsPorRisco: Record<string, number>;
  ticketsPorClassificacao: Record<string, number>;
  ticketsPorDia: Array<{ date: string; count: number }>;
  topSolicitantes: Array<{ nome: string; email: string; count: number }>;
  taxaCancelamento: number;
  tempoMedioResposta?: number;
  satisfacao?: number;
}
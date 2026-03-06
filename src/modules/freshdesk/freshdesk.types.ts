export interface FreshdeskTicket {
  id: number;
  subject: string;
  description?: string;
  status: number; // 2=Open, 3=Pending, 4=Resolved, 5=Closed
  priority: number; // 1=Low, 2=Medium, 3=High, 4=Urgent
  source: number; // 1=Email, 2=Portal, 3=Phone, 4=Chat, etc.
  created_at: string;
  updated_at: string;
  due_by?: string;
  fr_due_by?: string;
  type?: string;
  group_id?: number;
  requester_id: number;
  responder_id?: number;
  tags?: string[];
  custom_fields?: Record<string, any>;
}

export interface FreshdeskContact {
  id: number;
  name: string;
  email: string;
  phone?: string;
  mobile?: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
  custom_fields?: Record<string, any>;
}

export interface FreshdeskConversation {
  id: number;
  body: string;
  body_text: string;
  created_at: string;
  updated_at: string;
  user_id: number;
  source: number;
  ticket_id: number;
  incoming: boolean;
  private: boolean;
}

export interface MappedTicketData {
  // Campos obrigatórios
  ticketId: number;
  timestamp: Date;
  nome: string;
  email: string;
  assunto: string;
  totalTickets: number;
  urgente: 'SIM' | 'NÃO';
  vip: 'SIM' | 'NÃO';
  especializado: 'SIM' | 'NÃO';
  scoreRisco: 'ALTO' | 'MEDIO' | 'BAIXO';
  recorrencia: 'ALTA' | 'MEDIA' | 'BAIXA';
  classificacao: string;
  recomendacao: string;
  cancelouAntes: 'SIM' | 'NÃO';
  precisouIntegracao: 'SIM' | 'NÃO';
  diasComoCliente: number;
  status: string;
  
  // Campos opcionais
  problemaPagamento?: string;
  clienteDesde?: Date;
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
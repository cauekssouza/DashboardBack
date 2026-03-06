import { ApiProperty } from '@nestjs/swagger';

export class TicketEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  timestamp: Date;

  @ApiProperty()
  ticketId: number;

  @ApiProperty()
  nome: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false })
  assunto?: string;

  @ApiProperty()
  totalTickets: number;

  @ApiProperty()
  urgente: string;

  @ApiProperty()
  vip: string;

  @ApiProperty()
  especializado: string;

  @ApiProperty()
  scoreRisco: string;

  @ApiProperty()
  recorrencia: string;

  @ApiProperty()
  classificacao: string;

  @ApiProperty()
  recomendacao: string;

  @ApiProperty()
  cancelouAntes: string;

  @ApiProperty()
  precisouIntegracao: string;

  @ApiProperty({ required: false })
  problemaPagamento?: string;

  @ApiProperty({ required: false })
  clienteDesde?: Date;

  @ApiProperty()
  diasComoCliente: number;

  @ApiProperty()
  status: string;

  @ApiProperty({ required: false })
  prazo?: Date;

  @ApiProperty({ required: false })
  categoria?: string;

  @ApiProperty({ required: false })
  pilar?: string;

  @ApiProperty({ required: false })
  confianca?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
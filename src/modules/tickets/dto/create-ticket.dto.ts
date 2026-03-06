import { IsString, IsNumber, IsDateString, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty()
  @IsDateString()
  timestamp!: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  ticketId!: number;

  @ApiProperty()
  @IsString()
  nome!: string;

  @ApiProperty()
  @IsString()
  email!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  assunto?: string | null;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  totalTickets!: number;

  @ApiProperty({ enum: ['SIM', 'NÃO'] })
  @IsEnum(['SIM', 'NÃO'])
  urgente!: string;

  @ApiProperty({ enum: ['SIM', 'NÃO'] })
  @IsEnum(['SIM', 'NÃO'])
  vip!: string;

  @ApiProperty({ enum: ['SIM', 'NÃO'] })
  @IsEnum(['SIM', 'NÃO'])
  especializado!: string;

  @ApiProperty({ enum: ['ALTO', 'MEDIO', 'BAIXO'] })
  @IsEnum(['ALTO', 'MEDIO', 'BAIXO'])
  scoreRisco!: string;

  @ApiProperty({ enum: ['ALTA', 'MEDIA', 'BAIXA'] })
  @IsEnum(['ALTA', 'MEDIA', 'BAIXA'])
  recorrencia!: string;

  @ApiProperty()
  @IsString()
  classificacao!: string;

  @ApiProperty()
  @IsString()
  recomendacao!: string;

  @ApiProperty({ enum: ['SIM', 'NÃO'] })
  @IsEnum(['SIM', 'NÃO'])
  cancelouAntes!: string;

  @ApiProperty({ enum: ['SIM', 'NÃO'] })
  @IsEnum(['SIM', 'NÃO'])
  precisouIntegracao!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  problemaPagamento?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  clienteDesde?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  diasComoCliente!: number;

  @ApiProperty()
  @IsString()
  status!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  prazo?: string;

  // 🔥 NOVOS CAMPOS
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  idConversa?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  chat?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mensagens?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoria?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  pilar?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  confianca?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  acao?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  source?: string;
}
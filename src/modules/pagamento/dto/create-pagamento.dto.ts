import { IsEmail, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  @Min(1)
  amount!: number;

  @IsString()
  @IsOptional()
  currency?: string = 'brl';

  @IsEmail()
  customerEmail!: string;

  @IsString()
  customerName!: string;

  @IsString()
  @IsOptional()
  paymentMethod?: 'card' | 'pix' | 'boleto' = 'pix';

  @IsString()
  @IsOptional()
  ticketId?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
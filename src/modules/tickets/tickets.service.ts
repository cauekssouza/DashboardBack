import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketQueryDto } from './dto/ticket-query.dto';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  async create(createTicketDto: CreateTicketDto) {
    const data = {
      ...createTicketDto,
      timestamp: new Date(createTicketDto.timestamp),
      clienteDesde: createTicketDto.clienteDesde ? new Date(createTicketDto.clienteDesde) : null,
      prazo: createTicketDto.prazo ? new Date(createTicketDto.prazo) : null,
    };

    return this.prisma.ticket.create({
      data,
    });
  }

  async findAll(query: TicketQueryDto) {
    const { search, scoreRisco, status, startDate, endDate, page = 1, limit = 10000 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { assunto: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (scoreRisco) {
      where.scoreRisco = scoreRisco;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    const [tickets, total, payments] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.ticket.count({ where }),
      this.prisma.payment.findMany({
        where: { status: 'SUCCESS' },
        select: { customerEmail: true, amount: true, paidAt: true, paymentMethod: true },
      }),
    ]);

    // Criar mapa de pagamentos por email
    const paymentMap = new Map<string, { amount: number; paidAt: Date; paymentMethod: string }>();
    for (const payment of payments) {
      const existing = paymentMap.get(payment.customerEmail.toLowerCase());
      if (!existing || (payment.paidAt && new Date(payment.paidAt) > new Date(existing.paidAt))) {
        paymentMap.set(payment.customerEmail.toLowerCase(), {
          amount: payment.amount,
          paidAt: payment.paidAt || new Date(),
          paymentMethod: payment.paymentMethod,
        });
      }
    }

    // Adicionar informações de pagamento aos tickets
    const ticketsWithPayment = tickets.map(ticket => {
      const payment = paymentMap.get(ticket.email.toLowerCase());
      let problemaPagamento: string;
      
      if (payment) {
        problemaPagamento = 'PAGO';
      } else {
        problemaPagamento = ticket.problemaPagamento || 'NÃO PAGO';
      }

      return {
        ...ticket,
        problemaPagamento,
        valorPago: payment?.amount,
        dataPagamento: payment?.paidAt?.toISOString(),
        metodoPagamento: payment?.paymentMethod,
      };
    });

    return {
      data: ticketsWithPayment,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket com ID ${id} não encontrado`);
    }

    return ticket;
  }

  async findByTicketId(ticketId: number) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket com número ${ticketId} não encontrado`);
    }

    return ticket;
  }

  async update(id: string, updateTicketDto: UpdateTicketDto) {
    await this.findOne(id);

    const data: any = { ...updateTicketDto };
    
    if (updateTicketDto.timestamp) {
      data.timestamp = new Date(updateTicketDto.timestamp);
    }
    
    if (updateTicketDto.clienteDesde) {
      data.clienteDesde = new Date(updateTicketDto.clienteDesde);
    }
    
    if (updateTicketDto.prazo) {
      data.prazo = new Date(updateTicketDto.prazo);
    }

    return this.prisma.ticket.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.ticket.delete({
      where: { id },
    });
  }

  async upsertFromSheet(data: CreateTicketDto) {
    const ticketData = {
      ...data,
      timestamp: new Date(data.timestamp),
      clienteDesde: data.clienteDesde ? new Date(data.clienteDesde) : null,
      prazo: data.prazo ? new Date(data.prazo) : null,
    };

    return this.prisma.ticket.upsert({
      where: { ticketId: data.ticketId },
      update: ticketData,
      create: ticketData,
    });
  }

  async getUniqueValues() {
    const [status, scores, classificacoes] = await Promise.all([
      this.prisma.ticket.findMany({
        select: { status: true },
        distinct: ['status'],
      }),
      this.prisma.ticket.findMany({
        select: { scoreRisco: true },
        distinct: ['scoreRisco'],
      }),
      this.prisma.ticket.findMany({
        select: { classificacao: true },
        distinct: ['classificacao'],
      }),
    ]);

    return {
      status: status.map(s => s.status).filter(Boolean),
      scores: scores.map(s => s.scoreRisco).filter(Boolean),
      classificacoes: classificacoes.map(c => c.classificacao).filter(Boolean),
    };
  }
}
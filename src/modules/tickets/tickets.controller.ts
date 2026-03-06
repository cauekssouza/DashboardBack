import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketQueryDto } from './dto/ticket-query.dto';
import { TicketEntity } from './entities/ticket.entity';

@ApiTags('tickets')
@Controller('tickets')
export class TicketsController {
  [x: string]: any;
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar um novo ticket' })
  @ApiResponse({ status: 201, description: 'Ticket criado com sucesso', type: TicketEntity })
  create(@Body() createTicketDto: CreateTicketDto) {
    return this.ticketsService.create(createTicketDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os tickets' })
  @ApiResponse({ status: 200, description: 'Lista de tickets retornada com sucesso' })
  findAll(@Query() query: TicketQueryDto) {
    return this.ticketsService.findAll(query);
  }

  @Get('filters')
  @ApiOperation({ summary: 'Obter valores únicos para filtros' })
  getUniqueValues() {
    return this.ticketsService.getUniqueValues();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar ticket por ID' })
  @ApiResponse({ status: 200, description: 'Ticket encontrado', type: TicketEntity })
  @ApiResponse({ status: 404, description: 'Ticket não encontrado' })
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Get('ticket/:ticketId')
  @ApiOperation({ summary: 'Buscar ticket por número' })
  @ApiResponse({ status: 200, description: 'Ticket encontrado', type: TicketEntity })
  @ApiResponse({ status: 404, description: 'Ticket não encontrado' })
  findByTicketId(@Param('ticketId') ticketId: string) {
    return this.ticketsService.findByTicketId(+ticketId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar um ticket' })
  @ApiResponse({ status: 200, description: 'Ticket atualizado com sucesso', type: TicketEntity })
  @ApiResponse({ status: 404, description: 'Ticket não encontrado' })
  update(@Param('id') id: string, @Body() updateTicketDto: UpdateTicketDto) {
    return this.ticketsService.update(id, updateTicketDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover um ticket' })
  @ApiResponse({ status: 200, description: 'Ticket removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Ticket não encontrado' })
  remove(@Param('id') id: string) {
    return this.ticketsService.remove(id);
  }

@Get('all')
@ApiOperation({ summary: 'Buscar todos os tickets sem paginação' })
async findAllWithoutPagination() {
  const tickets = await this.prisma.ticket.findMany({
    orderBy: { timestamp: 'desc' },
  });
  return { data: tickets, total: tickets.length };
}
}
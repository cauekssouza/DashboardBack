
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { prisma } from '../lib/prisma';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  // ✅ EXPOR TODOS OS MODELOS
  get user() {
    return prisma.user;
  }

  get cliente() {
    return prisma.cliente;
  }

  get ticket() {
    return prisma.ticket;
  }

  get refreshToken() {
    return prisma.refreshToken;
  }

  // Métodos auxiliares
  async onModuleInit() {
    await prisma.$connect();
    console.log('✅ Banco de dados conectado!');
  }

  async onModuleDestroy() {
    await prisma.$disconnect();
    console.log('🔌 Banco de dados desconectado!');
  }
}
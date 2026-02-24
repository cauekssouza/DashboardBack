import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL não configurada no .env');
  }
  
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({ adapter }) as any;
}

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private prisma: PrismaClient;

  constructor() {
    this.prisma = createPrismaClient();
  }

  get client() {
    return this.prisma;
  }

  async onModuleInit() {
    await this.prisma.$connect();
    this.logger.log('✅ Banco de dados conectado');
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
    this.logger.log('❌ Banco de dados desconectado');
  }
}

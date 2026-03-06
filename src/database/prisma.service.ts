import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Configurar conexão com PostgreSQL usando adapter
    const connectionString = process.env.DATABASE_URL;
    
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    
    super({
      adapter,
      log: ['error', 'warn'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Conectado ao PostgreSQL com sucesso');
      
      // Testar conexão
      const result = await this.$queryRaw`SELECT 1 as test`;
      this.logger.log('✅ Query de teste executada com sucesso');
    } catch (error) {
      this.logger.error('❌ Erro ao conectar ao PostgreSQL:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Desconectado do PostgreSQL');
  }
}
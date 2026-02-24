import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configurar CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  console.log('\n' + '='.repeat(50));
  console.log('🚀 BACKEND SHEETS RODANDO!');
  console.log('='.repeat(50));
  console.log(`📡 URL: http://localhost:${port}`);
  console.log(`📡 Health: http://localhost:${port}/health`);
  console.log(`📡 Test DB: http://localhost:${port}/test-db`);
  console.log(`📡 Sheets fetch: http://localhost:${port}/sheets/fetch`);
  console.log(`📡 Sheets imports: http://localhost:${port}/sheets/imports`);
  console.log('='.repeat(50) + '\n');
}
bootstrap();
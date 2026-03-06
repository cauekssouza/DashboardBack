import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configurar CORS para o frontend
  app.enableCors({
    origin: 'http://localhost:3000', // URL do seu frontend Next.js
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Validação global
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Configuração do Swagger
  const config = new DocumentBuilder()
    .setTitle('Freshdesk API')
    .setDescription('API para dashboard de tickets Freshdesk')
    .setVersion('1.0')
    .addTag('tickets')
    .addTag('metrics')
    .addTag('sheets')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  console.log(`🚀 Backend rodando em http://localhost:${port}`);
  console.log(`📚 Swagger UI disponível em http://localhost:${port}/api`);
}

bootstrap();
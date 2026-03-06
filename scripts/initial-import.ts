import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SheetsService } from '../src/modules/tickets/sheets/sheets.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const sheetsService = app.get(SheetsService);

  console.log('Iniciando importação inicial...');
  
  try {
    const result = await sheetsService.manualSync();
    console.log('✅ Importação concluída:', result);
  } catch (error) {
    console.error('❌ Erro na importação:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
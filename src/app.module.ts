import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from './prisma/prisma.module';
import { SheetsModule } from './sheets/sheets.module';
import { FreshdeskModule } from './freshdesk/freshdesk.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60,
      limit: 10,
    }]),
    HttpModule,
    PrismaModule,
    SheetsModule,
    FreshdeskModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { TestController } from './test.controller';
import { PrismaService } from '../../../database/prisma.service';

@Module({
  controllers: [TestController],
  providers: [PrismaService],
})
export class TestModule {}
// back/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController],  // ← TEM QUE TER O CONTROLLER!
  providers: [AuthService],
})
export class AuthModule {}
// back/src/auth/auth.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';

@Controller('auth')  // ← Define o prefixo /auth
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')  // ← Define o método POST /auth/login
  async login(@Body() loginDto: any) {
    return this.authService.login(loginDto);
  }
}
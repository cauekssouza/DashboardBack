// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { LoginDto, RegisterDto, RefreshTokenDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
  const user = await this.usersService.findByEmail(email);
  
  if (!user) {
    throw new UnauthorizedException('E-mail ou senha inválidos');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  
  if (!isPasswordValid) {
    throw new UnauthorizedException('E-mail ou senha inválidos');
  }

  // ✅ REMOVER esta linha - método não existe
  // await this.usersService.updateLastLogin(user.id);
  
  const { password: _, ...result } = user;
  return result;
}

  async login(loginDto: LoginDto) {
    if (!loginDto.email || !loginDto.password) {
      throw new UnauthorizedException('E-mail e senha são obrigatórios');
    }

    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    
    return {
      user,
      ...tokens,
    };
  }

 async register(registerDto: RegisterDto) {
  const existingUser = await this.usersService.findByEmail(registerDto.email);
  
  if (existingUser) {
    throw new ConflictException('E-mail já cadastrado');
  }

  const hashedPassword = await bcrypt.hash(
    registerDto.password,
    Number(this.configService.get('BCRYPT_SALT_ROUNDS') || 10),
  );

  // ✅ Remover campos que não existem no schema
  const user = await this.prisma.user.create({
    data: {
      email: registerDto.email,
      password: hashedPassword,
      name: registerDto.name,
      role: 'ATTENDANT',
      // department: registerDto.department || null,  // ❌ REMOVER se não existir
      // phone: registerDto.phone || null,            // ❌ REMOVER se não existir
      // extension: registerDto.extension || null,    // ❌ REMOVER se não existir
    },
  });


    // ✅ VERIFICA SE O MODEL Activity EXISTE
    if (this.prisma.activity) {
      await this.prisma.activity.create({
        data: {
          action: 'USER_REGISTERED',
          description: `Usuário ${user.name} foi registrado`,
          entityType: 'USER',
          entityId: user.id,
          userId: user.id,
          metadata: { email: user.email, role: user.role },
        },
      }).catch(() => {
        console.log('Activity não configurada, ignorando...');
      });
    }

    const { password: _, ...result } = user;
    
    const tokens = await this.generateTokens(result.id, result.email, result.role);
    await this.saveRefreshToken(result.id, tokens.refreshToken);
    
    return {
      user: result,
      ...tokens,
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;
    
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token não fornecido');
    }

    try {
      const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
      if (!refreshSecret) {
        throw new Error('JWT_REFRESH_SECRET não configurada');
      }

      // ✅ VERIFICAÇÃO DO TOKEN
      const payload = this.jwtService.verify(refreshToken, {
        secret: refreshSecret,
      });

      const tokenRecord = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token inválido ou expirado');
      }

      const user = tokenRecord.user;
      
      const tokens = await this.generateTokens(user.id, user.email, user.role);
      
      await this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revokedAt: new Date() },
      });
      
      await this.saveRefreshToken(user.id, tokens.refreshToken);

      const { password: _, ...userWithoutPassword } = user;
      
      return {
        user: userWithoutPassword,
        ...tokens,
      };
    } catch (error) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
  }

  async logout(userId: string, refreshToken?: string) {
    if (!userId) {
      throw new UnauthorizedException('Usuário não identificado');
    }

    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: {
          token: refreshToken,
          userId,
        },
        data: { revokedAt: new Date() },
      });
    } else {
      await this.prisma.refreshToken.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }

    return { message: 'Logout realizado com sucesso' };
  }

  async generateTokens(userId: string, email: string, role: string) {
    if (!userId || !email || !role) {
      throw new Error('Dados de usuário inválidos para gerar token');
    }

    const secret = this.configService.get<string>('JWT_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '15m';
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    if (!secret || !refreshSecret) {
      throw new Error('JWT secrets não configuradas');
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email, role },
        { secret, expiresIn: expiresIn as any },
      ),
      this.jwtService.signAsync(
        { sub: userId, email, role, type: 'refresh' },
        { secret: refreshSecret, expiresIn: refreshExpiresIn as any },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  async saveRefreshToken(userId: string, refreshToken: string) {
    if (!userId || !refreshToken) {
      throw new Error('Dados inválidos para salvar refresh token');
    }

    const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
    const expiresAt = new Date();
    
    if (expiresIn.endsWith('d')) {
      const days = parseInt(expiresIn);
      expiresAt.setDate(expiresAt.getDate() + days);
    } else if (expiresIn.endsWith('m')) {
      const minutes = parseInt(expiresIn);
      expiresAt.setMinutes(expiresAt.getMinutes() + minutes);
    }

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });
  }

  async me(userId: string) {
    if (!userId) {
      throw new NotFoundException('Usuário não identificado');
    }

    const user = await this.usersService.findById(userId);
    
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const { password: _, ...result } = user;
    return result;
  }
}
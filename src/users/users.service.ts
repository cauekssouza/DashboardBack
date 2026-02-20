// src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto, ChangeUserRoleDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';  // ✅ IMPORTAR O ENUM

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: any;
    where?: any;
    orderBy?: any;
  }) {
    const { skip, take, cursor, where, orderBy } = params;
    
    return this.prisma.user.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findById(id);

    const data: any = {};

    if (updateUserDto.name) data.name = updateUserDto.name;
    if (updateUserDto.email) data.email = updateUserDto.email;

    // ✅ CORRIGIDO: Converter string para enum
    if (updateUserDto.role) {
      data.role = updateUserDto.role as Role;
    }

    if (updateUserDto.password) {
      data.password = await bcrypt.hash(
        updateUserDto.password,
        Number(this.configService.get('BCRYPT_SALT_ROUNDS')),
      );
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async changeRole(id: string, changeRoleDto: ChangeUserRoleDto) {
  const user = await this.findById(id);

  // ✅ Funciona porque convertemos string para enum
  return this.prisma.user.update({
    where: { id },
    data: {
      role: changeRoleDto.role as Role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
}
}

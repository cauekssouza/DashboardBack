// src/users/dto/user.dto.ts
import { Role } from '@prisma/client';  // ✅ IMPORTAR O ENUM

export class UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;  // ← Usar o tipo do enum
  department?: string;
  phone?: string;
  extension?: string;
  isActive?: boolean;
}

export class ChangeUserRoleDto {
  role!: Role;  // ← Usar o tipo do enum
}
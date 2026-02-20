// src/auth/dto/auth.dto.ts
export class LoginDto {
  email!: string;
  password!: string;
}

export class RegisterDto {
  name!: string;
  email!: string;
  password!: string;
  department?: string;
  phone?: string;
  extension?: string;
}

export class RefreshTokenDto {
  refreshToken!: string;
}
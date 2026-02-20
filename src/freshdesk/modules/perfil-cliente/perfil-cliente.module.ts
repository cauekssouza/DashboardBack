// src/freshdesk/modules/perfil-cliente/perfil-cliente.module.ts
import { Module } from '@nestjs/common';
import { PerfilClienteService } from './perfil-cliente.service';

@Module({
  providers: [PerfilClienteService],
  exports: [PerfilClienteService]  // ✅ IMPORTANTE!
})
export class PerfilClienteModule {}
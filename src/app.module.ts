// back/src/app.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';  // ← PRECISA IMPORTAR!

@Module({
  imports: [
    AuthModule,  // ← TEM QUE ESTAR AQUI!
    // outros módulos...
  ],
})
export class AppModule {}
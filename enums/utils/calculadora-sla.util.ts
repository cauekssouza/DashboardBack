// back/src/freshdesk/shared/utils/calculadora-sla.util.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class CalculadoraSlaUtil {
  calcularSLA(prazoSLA: Date): {
    slaEmRisco: boolean;
    tempoRestanteSLA: number;
    percentualConcluido: number;
  } {
    const agora = new Date();
    const tempoTotal = prazoSLA.getTime() - agora.getTime();
    const horasRestantes = tempoTotal / (1000 * 60 * 60);
    
    return {
      slaEmRisco: horasRestantes < 4,
      tempoRestanteSLA: Math.max(0, Math.round(horasRestantes * 10) / 10),
      percentualConcluido: this.calcularPercentual(agora, prazoSLA)
    };
  }

  private calcularPercentual(inicio: Date, fim: Date): number {
    const total = fim.getTime() - inicio.getTime();
    const decorrido = Date.now() - inicio.getTime();
    return Math.min(100, Math.max(0, (decorrido / total) * 100));
  }
}
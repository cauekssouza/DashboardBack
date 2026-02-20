// back/src/freshdesk/shared/utils/calculadora-risco.util.ts
import { Injectable } from '@nestjs/common';
import { ScoreRisco } from '../freshdesk.enums';

@Injectable()
export class CalculadoraRiscoUtil {
  calcular(
    totalCancelamentos: number,
    tempoMedioResolucao: number,
    ticketsAbertos: number
  ): ScoreRisco {
    if (totalCancelamentos >= 2 || tempoMedioResolucao > 48 || ticketsAbertos >= 3) {
      return ScoreRisco.ALTO;
    }
    if (totalCancelamentos >= 1 || tempoMedioResolucao > 24 || ticketsAbertos >= 1) {
      return ScoreRisco.MEDIO;
    }
    return ScoreRisco.BAIXO;
  }
}
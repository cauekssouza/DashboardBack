// back/src/freshdesk/shared/utils/calculadora-recorrencia.util.ts
import { Injectable } from '@nestjs/common';
import { ScoreRecorrencia } from '../freshdesk.enums';

@Injectable()
export class CalculadoraRecorrenciaUtil {
  calcular(totalTickets: number, diasComoCliente: number): ScoreRecorrencia {
    const ticketsPorDia = totalTickets / diasComoCliente;
    const ticketsPorMes = ticketsPorDia * 30;
    
    if (ticketsPorDia > 0.1 || ticketsPorMes > 5) {
      return ScoreRecorrencia.ALTA;
    }
    if (ticketsPorDia > 0.05 || ticketsPorMes > 2) {
      return ScoreRecorrencia.MEDIA;
    }
    return ScoreRecorrencia.BAIXA;
  }
}
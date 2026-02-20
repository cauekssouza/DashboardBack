// back/src/freshdesk/shared/utils/classificador-cliente.util.ts
import { Injectable } from '@nestjs/common';
import { ClassificacaoCliente, ScoreRecorrencia } from '../freshdesk.enums';

@Injectable()
export class ClassificadorClienteUtil {
  classificar(
    totalTickets: number,
    diasComoCliente: number,
    scoreRecorrencia: ScoreRecorrencia,
    isVIP: boolean = false
  ): ClassificacaoCliente {
    if (isVIP) return ClassificacaoCliente.VIP;
    if (scoreRecorrencia === ScoreRecorrencia.ALTA && totalTickets >= 10) {
      return ClassificacaoCliente.RECORRENTE;
    }
    if (diasComoCliente < 30) return ClassificacaoCliente.NOVO;
    if (totalTickets >= 5) return ClassificacaoCliente.OCASIONAL;
    return ClassificacaoCliente.COMUM;
  }
}
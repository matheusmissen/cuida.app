// Check-in diário iniciado pela Lia no horário configurado pela família.
// Tentativa 1 no horário, tentativa 2 trinta minutos depois. Cada tentativa espera 30 min.
// Duas tentativas sem resposta (1 h depois do horário) → avaliarCheckinSemResposta (laranja).
// Servidor e app usam esta mesma conta: o app para saber quando a Lia chama, o servidor para alertar.

import { avaliarCheckinSemResposta, dataLocal } from './avaliar.ts';
import type { Alerta } from './tipos.ts';

const MINUTO = 60_000;
const FUSO_PADRAO = -180;
export const INTERVALO_TENTATIVA_MIN = 30;

export interface SituacaoCheckin {
  /** Já houve check-in hoje (dia local): nada a fazer. */
  feito: boolean;
  /** A Lia está esperando a resposta (passou do horário e ainda não houve check-in hoje). */
  aguardando: boolean;
  /** Tentativa em andamento (0 antes do horário, 1 ou 2 depois). */
  tentativa: 0 | 1 | 2;
  /** Tentativas cuja janela de 30 min acabou sem check-in. */
  tentativasSemResposta: number;
  /** Alerta laranja quando as 2 tentativas ficaram sem resposta. */
  alerta: Alerta | null;
}

/** Converte 'HH:MM' ou 'HH:MM:SS' de um dia local em instante. */
function instanteLocal(dia: string, hora: string, fusoMinutos: number): number {
  const [h, m] = hora.split(':').map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h > 23 || m > 59) {
    throw new Error(`Horário inválido: ${hora}`);
  }
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return Date.parse(`${dia}T${hh}:${mm}:00Z`) - fusoMinutos * MINUTO;
}

/** Instantes das duas tentativas do check-in no dia local de `referencia`. */
export function tentativasDoCheckin(horario: string, referencia: Date, fusoMinutos = FUSO_PADRAO): Date[] {
  const t1 = instanteLocal(dataLocal(referencia.toISOString(), fusoMinutos), horario, fusoMinutos);
  return [new Date(t1), new Date(t1 + INTERVALO_TENTATIVA_MIN * MINUTO)];
}

export function situacaoDoCheckin(
  horario: string,
  agora: Date,
  ultimoCheckinEm: string | null,
  fusoMinutos = FUSO_PADRAO,
): SituacaoCheckin {
  const hoje = dataLocal(agora.toISOString(), fusoMinutos);
  const feito = Boolean(ultimoCheckinEm && dataLocal(ultimoCheckinEm, fusoMinutos) === hoje);
  if (feito) return { feito, aguardando: false, tentativa: 0, tentativasSemResposta: 0, alerta: null };

  const t = agora.getTime();
  const [t1, t2] = tentativasDoCheckin(horario, agora, fusoMinutos).map((d) => d.getTime());
  const janela = INTERVALO_TENTATIVA_MIN * MINUTO;
  const tentativa: 0 | 1 | 2 = t >= t2 ? 2 : t >= t1 ? 1 : 0;
  const tentativasSemResposta = (t >= t1 + janela ? 1 : 0) + (t >= t2 + janela ? 1 : 0);
  return {
    feito,
    aguardando: tentativa > 0,
    tentativa,
    tentativasSemResposta,
    alerta: avaliarCheckinSemResposta(tentativasSemResposta),
  };
}

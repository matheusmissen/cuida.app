// Check-in diário (docs/PRD.md, seção 4).
// Um lembrete no horário definido pela família (padrão 08:00). Sem check-in até a tolerância
// (padrão 15 min) → avaliarCheckinSemResposta (laranja: responsável primeiro, depois o grupo).
// Servidor e apps usam esta mesma conta: o app para saber quando chamar, o servidor para alertar.

import { avaliarCheckinSemResposta, dataLocal } from './avaliar.ts';
import { TEMPOS_PADRAO, type Tempos } from './tempos.ts';
import type { Alerta } from './tipos.ts';

const MINUTO = 60_000;
const FUSO_PADRAO = -180;

export interface SituacaoCheckin {
  /** Já houve check-in hoje (dia local): nada a fazer. */
  feito: boolean;
  /** Passou do horário e ainda não houve check-in hoje: o app chama o idoso. */
  aguardando: boolean;
  /** 1 depois do horário (lembrete enviado), 0 antes. */
  tentativa: 0 | 1;
  /** Minutos desde o horário sem check-in (0 antes do horário ou se já foi feito). */
  minutosSemResposta: number;
  /** Alerta laranja quando passou a tolerância sem check-in. */
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

/** Instante do lembrete do check-in no dia local de `referencia` (lista com um item). */
export function tentativasDoCheckin(horario: string, referencia: Date, fusoMinutos = FUSO_PADRAO): Date[] {
  return [new Date(instanteLocal(dataLocal(referencia.toISOString(), fusoMinutos), horario, fusoMinutos))];
}

export function situacaoDoCheckin(
  horario: string,
  agora: Date,
  ultimoCheckinEm: string | null,
  tempos: Tempos = TEMPOS_PADRAO,
  fusoMinutos = FUSO_PADRAO,
): SituacaoCheckin {
  const hoje = dataLocal(agora.toISOString(), fusoMinutos);
  const feito = Boolean(ultimoCheckinEm && dataLocal(ultimoCheckinEm, fusoMinutos) === hoje);
  if (feito) return { feito, aguardando: false, tentativa: 0, minutosSemResposta: 0, alerta: null };

  const [lembrete] = tentativasDoCheckin(horario, agora, fusoMinutos);
  const passou = agora.getTime() - lembrete.getTime();
  if (passou < 0) return { feito, aguardando: false, tentativa: 0, minutosSemResposta: 0, alerta: null };

  const minutosSemResposta = Math.floor(passou / MINUTO);
  return {
    feito,
    aguardando: true,
    tentativa: 1,
    minutosSemResposta,
    alerta: avaliarCheckinSemResposta(minutosSemResposta, tempos),
  };
}

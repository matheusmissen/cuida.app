// Quem avisar em cada alerta. Lógica pura, testada em Node.
// Vermelho: todo o círculo na hora.
// Laranja: o primeiro da escala; a cada 30 min sem ninguém marcar como visto, entra o próximo.
// Amarelo e informativo: ninguém na hora (vão para o resumo diário).

import type { Nivel } from '../regras/index.ts';

export interface CuidadorEscala {
  usuario_id: string;
  ordem_escala: number;
  expo_push_token: string | null;
}

export const INTERVALO_ESCALA_MIN = 30;

function porEscala(cuidadores: CuidadorEscala[]): CuidadorEscala[] {
  return [...cuidadores].sort(
    (a, b) => a.ordem_escala - b.ordem_escala || a.usuario_id.localeCompare(b.usuario_id),
  );
}

/** Todos que já deveriam ter sido avisados, dado o tempo desde a criação do alerta. */
export function devemSerAvisados(
  nivel: Nivel,
  cuidadores: CuidadorEscala[],
  minutosDesdeCriacao: number,
): CuidadorEscala[] {
  if (nivel === 'vermelho') return porEscala(cuidadores);
  if (nivel !== 'laranja') return [];
  const quantos = 1 + Math.floor(Math.max(0, minutosDesdeCriacao) / INTERVALO_ESCALA_MIN);
  return porEscala(cuidadores).slice(0, quantos);
}

/** Só quem ainda não foi avisado. Alerta já visto por alguém não escala mais. */
export function novosDestinatarios(
  nivel: Nivel,
  cuidadores: CuidadorEscala[],
  minutosDesdeCriacao: number,
  jaAvisados: string[],
  visto: boolean,
): CuidadorEscala[] {
  if (visto) return [];
  const avisados = new Set(jaAvisados);
  return devemSerAvisados(nivel, cuidadores, minutosDesdeCriacao).filter((c) => !avisados.has(c.usuario_id));
}

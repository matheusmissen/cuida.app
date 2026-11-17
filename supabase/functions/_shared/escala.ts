// Quem a família avisa, e quando (docs/PRD.md, seção 2).
// Vermelho (emergência): todo o grupo na hora, sem escalada.
// Laranja (alerta crítico): o responsável principal; se ele não agir em `escaladaMin`
// (padrão 15 min), todos os outros do grupo de uma vez. Amarelo: sem push (resumo diário fora do MVP).

import { TEMPOS_PADRAO, type Nivel } from '../../../packages/regras/src/index.ts';

export interface Cuidador {
  usuarioId: string;
  papel: 'principal' | 'apoio';
  ordemEscala: number;
  pushToken: string | null;
}

export interface AlertaAberto {
  nivel: Nivel;
  criadoEm: string;
  avisados: string[];
  vistoEm: string | null;
}

/** Principal primeiro; depois pela ordem da escala. */
export function ordemDaEscala(cuidadores: Cuidador[]): Cuidador[] {
  return [...cuidadores].sort((a, b) => {
    if (a.papel !== b.papel) return a.papel === 'principal' ? -1 : 1;
    return a.ordemEscala - b.ordemEscala;
  });
}

/** Quem recebe push no momento em que o alerta é criado. */
export function destinatariosIniciais(nivel: Nivel, cuidadores: Cuidador[]): Cuidador[] {
  const escala = ordemDaEscala(cuidadores);
  if (nivel === 'vermelho') return escala;
  if (nivel === 'laranja') return escala.slice(0, 1);
  return []; // amarelo vai no resumo diário; informativo fica só no histórico
}

/**
 * Para um alerta laranja que ninguém marcou como visto: quem ainda precisa ser avisado agora.
 * "Agir" = marcar o alerta como visto no app da família ("Vi, estou cuidando").
 */
export function proximosDaEscala(
  alerta: AlertaAberto,
  cuidadores: Cuidador[],
  agora: Date,
  escaladaMin: number = TEMPOS_PADRAO.escaladaMin,
): Cuidador[] {
  if (alerta.nivel !== 'laranja' || alerta.vistoEm) return [];
  if (agora.getTime() - Date.parse(alerta.criadoEm) < escaladaMin * 60_000) return [];
  return ordemDaEscala(cuidadores).filter((c) => !alerta.avisados.includes(c.usuarioId));
}

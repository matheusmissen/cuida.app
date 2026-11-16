// Quem a família avisa, e quando.
// Vermelho: todo o círculo na hora. Laranja: o responsável principal; sem resposta
// em 30 min, o próximo da escala (e assim por diante). Amarelo: resumo diário.

import type { Nivel } from '../../../packages/regras/src/index.ts';

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

const MINUTOS_ESCALA = 30;

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

/** Para um alerta laranja não visto: quem ainda precisa ser avisado agora. */
export function proximosDaEscala(alerta: AlertaAberto, cuidadores: Cuidador[], agora: Date): Cuidador[] {
  if (alerta.nivel !== 'laranja' || alerta.vistoEm) return [];
  const passados = Math.floor((agora.getTime() - Date.parse(alerta.criadoEm)) / (MINUTOS_ESCALA * 60_000));
  if (passados < 1) return [];
  const escala = ordemDaEscala(cuidadores);
  const deveTerAvisado = escala.slice(0, Math.min(1 + passados, escala.length));
  return deveTerAvisado.filter((c) => !alerta.avisados.includes(c.usuarioId));
}

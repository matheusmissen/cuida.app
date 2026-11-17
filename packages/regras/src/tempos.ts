// Tempos de tolerância e de escalada (docs/PRD.md, seções 2, 4 e 5).
// Configuráveis por paciente (colunas de `pacientes`), para encurtar tudo a 1 minuto na demonstração.

export interface Tempos {
  /** Minutos sem "Tomei" até avisar o responsável principal. PRD: 30 (a mesma tolerância da métrica de adesão). */
  toleranciaDoseMin: number;
  /** Minutos sem check-in, depois do horário, até avisar o responsável principal. PRD: 15. */
  toleranciaCheckinMin: number;
  /** Minutos sem o responsável agir até avisar todo o grupo. PRD: 15. */
  escaladaMin: number;
}

export const TEMPOS_PADRAO: Tempos = { toleranciaDoseMin: 30, toleranciaCheckinMin: 15, escaladaMin: 15 };

/** Tudo em 1 minuto, para a apresentação aos jurados. */
export const TEMPOS_DEMONSTRACAO: Tempos = { toleranciaDoseMin: 1, toleranciaCheckinMin: 1, escaladaMin: 1 };

/** Limites aceitos (os mesmos da restrição no banco). */
export const TEMPO_MIN = 1;
export const TEMPO_MAX = 240;

function minutos(valor: unknown, padrao: number): number {
  const n = typeof valor === 'string' ? Number(valor) : valor;
  if (typeof n !== 'number' || !Number.isFinite(n)) return padrao;
  return Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, Math.round(n)));
}

/**
 * Lê os tempos de uma linha de `pacientes`. Campo ausente ou inválido usa o padrão do PRD;
 * fora dos limites é ajustado para dentro deles. Nunca devolve zero (que dispararia na hora).
 */
export function temposDoPaciente(linha?: {
  tolerancia_dose_min?: unknown;
  tolerancia_checkin_min?: unknown;
  escalada_min?: unknown;
} | null): Tempos {
  return {
    toleranciaDoseMin: minutos(linha?.tolerancia_dose_min, TEMPOS_PADRAO.toleranciaDoseMin),
    toleranciaCheckinMin: minutos(linha?.tolerancia_checkin_min, TEMPOS_PADRAO.toleranciaCheckinMin),
    escaladaMin: minutos(linha?.escalada_min, TEMPOS_PADRAO.escaladaMin),
  };
}

/** Os tempos são os de demonstração (tudo em 1 minuto)? */
export const emModoDemonstracao = (t: Tempos): boolean =>
  t.toleranciaDoseMin === 1 && t.toleranciaCheckinMin === 1 && t.escaladaMin === 1;

/** "1 minuto", "30 minutos". */
export const minutosPorExtenso = (n: number): string => `${n} ${n === 1 ? 'minuto' : 'minutos'}`;

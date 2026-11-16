// Conversão entre a linha da tabela `checkins` (snake_case) e o tipo Checkin do motor de regras.

import type { Cansaco, Checkin, Humor } from '../../../packages/regras/src/index.ts';

export interface LinhaCheckin {
  paciente_id: string;
  feito_em: string;
  febre?: boolean | null;
  temperatura?: number | string | null;
  calafrio?: boolean | null;
  sangramento?: boolean | null;
  manchas?: boolean | null;
  sinais_infeccao?: boolean | null;
  cansaco?: string | null;
  humor?: string | null;
  apetite_baixo?: boolean | null;
  nausea?: boolean | null;
  queda?: boolean | null;
  dor_no_peito?: boolean | null;
  falta_de_ar?: boolean | null;
  confuso?: boolean | null;
  sono?: string | null;
  notas?: string | null;
}

const CANSACOS: Cansaco[] = ['nenhum', 'leve', 'forte'];
const HUMORES: Humor[] = ['bom', 'regular', 'baixo'];

const bool = (v: unknown): boolean | undefined => (v === true ? true : v === false ? false : undefined);

/** Temperatura plausível (30 a 45 °C) ou null. Aceita "38,2". */
export function temperaturaValida(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : typeof v === 'number' ? v : NaN;
  if (!Number.isFinite(n) || n < 30 || n > 45) return null;
  return Math.round(n * 10) / 10;
}

export function deLinha(l: LinhaCheckin): Checkin {
  return {
    feitoEm: l.feito_em,
    febre: bool(l.febre),
    temperatura: temperaturaValida(l.temperatura),
    calafrio: bool(l.calafrio),
    sangramento: bool(l.sangramento),
    manchas: bool(l.manchas),
    sinaisInfeccao: bool(l.sinais_infeccao),
    cansaco: CANSACOS.includes(l.cansaco as Cansaco) ? (l.cansaco as Cansaco) : undefined,
    humor: HUMORES.includes(l.humor as Humor) ? (l.humor as Humor) : undefined,
    apetiteBaixo: bool(l.apetite_baixo),
    nausea: bool(l.nausea),
    queda: bool(l.queda),
    dorNoPeito: bool(l.dor_no_peito),
    faltaDeAr: bool(l.falta_de_ar),
    confuso: bool(l.confuso),
  };
}

export function paraLinha(c: Checkin, pacienteId: string, extra: { sono?: string; notas?: string } = {}): LinhaCheckin {
  return {
    paciente_id: pacienteId,
    feito_em: c.feitoEm,
    febre: c.febre ?? null,
    temperatura: c.temperatura ?? null,
    calafrio: c.calafrio ?? null,
    sangramento: c.sangramento ?? null,
    manchas: c.manchas ?? null,
    sinais_infeccao: c.sinaisInfeccao ?? null,
    cansaco: c.cansaco ?? null,
    humor: c.humor ?? null,
    apetite_baixo: c.apetiteBaixo ?? null,
    nausea: c.nausea ?? null,
    queda: c.queda ?? null,
    dor_no_peito: c.dorNoPeito ?? null,
    falta_de_ar: c.faltaDeAr ?? null,
    confuso: c.confuso ?? null,
    sono: extra.sono ?? null,
    notas: extra.notas ?? null,
  };
}

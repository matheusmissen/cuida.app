// Utilitários puros sobre doses (sem React Native): testados em Node.
import { avaliarDose, TEMPOS_PADRAO, type Tempos } from '@cuida/regras';
import type { DoseComRemedio } from './tipos.ts';

const MINUTO = 60_000;

export type SituacaoDose = 'tomada' | 'perdida' | 'agora' | 'futura';

/**
 * Situação da dose para mostrar na tela, decidida pelo motor de regras.
 * 'perdida' = passou a tolerância sem "Tomei" (a família foi avisada).
 */
export function situacaoDose(dose: DoseComRemedio, agora: Date, tempos: Tempos = TEMPOS_PADRAO): SituacaoDose {
  if (dose.confirmado_em) return 'tomada';
  if (dose.status === 'perdido') return 'perdida';
  const acao = avaliarDose(
    {
      previstoEm: dose.previsto_em,
      confirmadoEm: dose.confirmado_em,
      critico: dose.horarios.remedios.critico,
      nomeRemedio: dose.horarios.remedios.nome,
    },
    agora,
    tempos,
  );
  if (acao.acao === 'alertar') return 'perdida';
  return Date.parse(dose.previsto_em) <= agora.getTime() ? 'agora' : 'futura';
}

/**
 * Doses que o alarme do idoso deve mostrar agora: já passaram do horário, não foram
 * confirmadas e são das últimas `janelaHoras` horas. Mais antigas primeiro.
 */
export function dosesDevidas(doses: DoseComRemedio[], agora: Date, janelaHoras = 6): DoseComRemedio[] {
  const t = agora.getTime();
  return doses
    .filter((d) => !d.confirmado_em)
    .filter((d) => {
      const p = Date.parse(d.previsto_em);
      return p <= t && p >= t - janelaHoras * 60 * MINUTO;
    })
    .sort((a, b) => Date.parse(a.previsto_em) - Date.parse(b.previsto_em));
}

/** Próxima dose ainda não confirmada depois de agora. */
export function proximaDose(doses: DoseComRemedio[], agora: Date): DoseComRemedio | null {
  return (
    doses
      .filter((d) => !d.confirmado_em && Date.parse(d.previsto_em) > agora.getTime())
      .sort((a, b) => Date.parse(a.previsto_em) - Date.parse(b.previsto_em))[0] ?? null
  );
}

/**
 * O alarme deve falar de novo? Quando passa a tolerância sem "Tomei" (a família acaba de ser
 * avisada) ou quando o servidor marcou a dose para tocar de novo.
 */
export function deveRealarmar(dose: DoseComRemedio, agora: Date, tempos: Tempos = TEMPOS_PADRAO): boolean {
  const acao = avaliarDose(
    {
      previstoEm: dose.previsto_em,
      confirmadoEm: dose.confirmado_em,
      critico: dose.horarios.remedios.critico,
      nomeRemedio: dose.horarios.remedios.nome,
    },
    agora,
    tempos,
  ).acao;
  return acao === 'alertar' || Boolean(dose.realarmado_em);
}

/** Instantes em que o celular deve tocar: no horário e 30 min depois. Só os futuros. */
export function instantesDeAlarme(dose: DoseComRemedio, agora: Date): Date[] {
  if (dose.confirmado_em) return [];
  const p = Date.parse(dose.previsto_em);
  return [p, p + 30 * MINUTO].filter((t) => t > agora.getTime()).map((t) => new Date(t));
}

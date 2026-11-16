// ARQUIVO GERADO por scripts/sincronizar-regras.mjs a partir de packages/regras/src. NÃO EDITE.
// Motor de regras de alerta do Cuida.
// Princípio: na dúvida, a regra sobe de nível. Um alerta falso custa um telefonema;
// um alerta perdido pode custar uma internação.

import type { AcaoDose, Alerta, Checkin, ConfigPaciente, Dose, Nivel } from './tipos.ts';

export const LIMITE_FEBRE_PADRAO = 37.8;
const FUSO_PADRAO = -180; // Brasília, sem horário de verão desde 2019

const MINUTO = 60_000;
const HORA = 60 * MINUTO;

const PESO: Record<Nivel, number> = { vermelho: 3, laranja: 2, amarelo: 1, informativo: 0 };

/** Ordena do mais grave para o menos grave e remove gatilhos repetidos. */
export function ordenarAlertas(alertas: Alerta[]): Alerta[] {
  const vistos = new Set<string>();
  return [...alertas]
    .sort((a, b) => PESO[b.nivel] - PESO[a.nivel])
    .filter((a) => (vistos.has(a.gatilho) ? false : (vistos.add(a.gatilho), true)));
}

export function nivelMaximo(alertas: Alerta[]): Nivel | null {
  if (alertas.length === 0) return null;
  return ordenarAlertas(alertas)[0].nivel;
}

/** Data local (AAAA-MM-DD) de um instante ISO, no fuso do paciente. */
export function dataLocal(iso: string, fusoMinutos = FUSO_PADRAO): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new Error(`Data inválida: ${iso}`);
  return new Date(ms + fusoMinutos * MINUTO).toISOString().slice(0, 10);
}

function diaAnterior(data: string): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Quantos dias seguidos, terminando no check-in atual, a condição foi verdadeira.
 * Usa um check-in por dia (o mais recente de cada dia). Um dia sem check-in quebra a sequência.
 */
export function diasSeguidos(
  atual: Checkin,
  anteriores: Checkin[],
  condicao: (c: Checkin) => boolean,
  fusoMinutos = FUSO_PADRAO,
): number {
  if (!condicao(atual)) return 0;
  const porDia = new Map<string, Checkin>();
  for (const c of [...anteriores].sort((a, b) => Date.parse(b.feitoEm) - Date.parse(a.feitoEm))) {
    const dia = dataLocal(c.feitoEm, fusoMinutos);
    if (!porDia.has(dia)) porDia.set(dia, c);
  }
  let contagem = 1;
  let dia = dataLocal(atual.feitoEm, fusoMinutos);
  for (;;) {
    dia = diaAnterior(dia);
    const c = porDia.get(dia);
    if (!c || !condicao(c)) return contagem;
    contagem += 1;
  }
}

function temFebre(c: Checkin, limite: number): boolean {
  const temperaturaAlta = typeof c.temperatura === 'number' && c.temperatura >= limite;
  return Boolean(c.febre || c.calafrio || temperaturaAlta);
}

/**
 * Avalia um check-in novo.
 * @param atual check-in que acabou de ser registrado
 * @param anteriores check-ins anteriores do mesmo paciente (qualquer ordem, sem o atual)
 */
export function avaliarCheckin(
  atual: Checkin,
  anteriores: Checkin[],
  config: ConfigPaciente,
): Alerta[] {
  const fuso = config.fusoMinutos ?? FUSO_PADRAO;
  const limiteFebre = config.limiteFebre ?? LIMITE_FEBRE_PADRAO;
  const alertas: Alerta[] = [];

  // Regras gerais (todos os pacientes)
  if (atual.queda) {
    alertas.push({ nivel: 'vermelho', gatilho: 'geral.queda', motivo: 'Relatou uma queda.' });
  }
  if (atual.dorNoPeito) {
    alertas.push({ nivel: 'vermelho', gatilho: 'geral.dor_no_peito', motivo: 'Relatou dor no peito.' });
  }
  if (atual.faltaDeAr) {
    alertas.push({ nivel: 'vermelho', gatilho: 'geral.falta_de_ar', motivo: 'Relatou falta de ar.' });
  }
  if (diasSeguidos(atual, anteriores, (c) => Boolean(c.confuso), fuso) >= 2) {
    alertas.push({
      nivel: 'laranja',
      gatilho: 'geral.confusao',
      motivo: 'Respostas confusas em 2 check-ins seguidos.',
    });
  }
  if (diasSeguidos(atual, anteriores, (c) => c.humor === 'baixo', fuso) >= 3) {
    alertas.push({ nivel: 'amarelo', gatilho: 'geral.humor_baixo', motivo: 'Humor baixo há 3 dias.' });
  }

  // Modelo leucemia (limites a validar com o hematologista)
  if (config.condicoes.includes('leucemia')) {
    if (temFebre(atual, limiteFebre)) {
      const detalhe =
        typeof atual.temperatura === 'number' ? ` (${atual.temperatura.toFixed(1)} °C)` : '';
      alertas.push({
        nivel: 'vermelho',
        gatilho: 'leucemia.febre',
        motivo: `Febre ou calafrio${detalhe}. Em tratamento de leucemia, procurar o médico.`,
      });
    }
    if (atual.sangramento) {
      alertas.push({ nivel: 'vermelho', gatilho: 'leucemia.sangramento', motivo: 'Relatou sangramento.' });
    }
    if (atual.manchas) {
      alertas.push({ nivel: 'laranja', gatilho: 'leucemia.manchas', motivo: 'Manchas roxas novas.' });
    }
    if (atual.sinaisInfeccao) {
      alertas.push({ nivel: 'laranja', gatilho: 'leucemia.infeccao', motivo: 'Possíveis sinais de infecção.' });
    }
    if (diasSeguidos(atual, anteriores, (c) => c.cansaco === 'forte', fuso) >= 3) {
      alertas.push({ nivel: 'laranja', gatilho: 'leucemia.cansaco', motivo: 'Cansaço forte há 3 dias.' });
    }
    if (diasSeguidos(atual, anteriores, (c) => Boolean(c.apetiteBaixo || c.nausea), fuso) >= 2) {
      alertas.push({
        nivel: 'amarelo',
        gatilho: 'leucemia.apetite',
        motivo: 'Falta de apetite ou náusea há 2 dias.',
      });
    }
  }

  return ordenarAlertas(alertas);
}

/**
 * Decide o que fazer com uma dose.
 * 30 min sem confirmação: toca o alarme de novo. 60 min: alerta (vermelho se o remédio for crítico).
 */
export function avaliarDose(dose: Dose, agora: Date): AcaoDose {
  if (dose.confirmadoEm) return { acao: 'nenhuma' };
  const atraso = agora.getTime() - Date.parse(dose.previstoEm);
  if (atraso >= HORA) {
    return {
      acao: 'alertar',
      alerta: {
        nivel: dose.critico ? 'vermelho' : 'laranja',
        gatilho: dose.critico ? 'dose.critica_perdida' : 'dose.perdida',
        motivo: `Não confirmou ${dose.nomeRemedio} há mais de 1 hora.`,
      },
    };
  }
  if (atraso >= 30 * MINUTO) return { acao: 'realarmar' };
  return { acao: 'nenhuma' };
}

/** Nenhuma interação com o app em 24 horas. */
export function avaliarSilencio(ultimaInteracaoEm: string, agora: Date): Alerta | null {
  const parado = agora.getTime() - Date.parse(ultimaInteracaoEm);
  if (parado < 24 * HORA) return null;
  return {
    nivel: 'vermelho',
    gatilho: 'geral.silencio_24h',
    motivo: 'Nenhuma interação com o app nas últimas 24 horas.',
  };
}

/** Check-in sem resposta após 2 tentativas. */
export function avaliarCheckinSemResposta(tentativasSemResposta: number): Alerta | null {
  if (tentativasSemResposta < 2) return null;
  return {
    nivel: 'laranja',
    gatilho: 'geral.checkin_sem_resposta',
    motivo: 'Não respondeu ao check-in após 2 tentativas.',
  };
}

/** Botão "Preciso de ajuda". */
export function pedidoDeAjuda(motivo?: string): Alerta {
  return {
    nivel: 'vermelho',
    gatilho: 'geral.pedido_de_ajuda',
    motivo: motivo ? `Pediu ajuda: ${motivo}` : 'Apertou o botão "Preciso de ajuda".',
  };
}

/** Estoque de remédio abaixo de 5 dias. */
export function avaliarEstoque(nomeRemedio: string, dosesRestantes: number, dosesPorDia: number): Alerta | null {
  if (dosesPorDia <= 0) return null;
  if (dosesRestantes / dosesPorDia >= 5) return null;
  return {
    nivel: 'amarelo',
    gatilho: 'geral.estoque_baixo',
    motivo: `${nomeRemedio}: estoque para menos de 5 dias.`,
  };
}

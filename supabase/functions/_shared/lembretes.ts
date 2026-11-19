// O que vira notificação, e quando (docs/PRD.md, seções 4, 5 e 6). Lógica pura, testada em Node.
// - Alerta crítico (laranja) e emergência (vermelho): para a família, pela escalada de escala.ts.
// - Lembrete do remédio: para o idoso, no horário, uma vez por dose, até a tolerância.
// - Lembrete do check-in: para o idoso, no horário, uma vez por dia.

import { dataLocal, situacaoDoCheckin, type Alerta, type Tempos } from '../../../packages/regras/src/index.ts';
import type { Notificacao } from './webpush.ts';

const MINUTO = 60_000;
const FUSO = -180; // Brasília

/** Notificação de um alerta para a família. Só laranja e vermelho chegam por notificação. */
export function notificacaoDoAlerta(alerta: Alerta, alertaId: string, nomePaciente: string): Notificacao {
  const tipo = alerta.nivel === 'vermelho' ? 'Emergência' : alerta.nivel === 'laranja' ? 'Alerta crítico' : 'Aviso';
  return {
    titulo: `${tipo} · ${nomePaciente}`,
    corpo: alerta.motivo,
    url: '/',
    etiqueta: `alerta-${alertaId}`,
    urgente: alerta.nivel === 'vermelho' || alerta.nivel === 'laranja',
  };
}

export interface DoseParaLembrar {
  id: string;
  pacienteId: string;
  previstoEm: string;
  confirmadoEm: string | null;
  lembreteEm: string | null;
}

/**
 * Doses cujo lembrete deve sair agora: já chegou o horário, sem "Tomei", sem lembrete enviado
 * e ainda dentro da tolerância (depois dela, quem é avisado é a família).
 */
export function dosesParaLembrar(doses: DoseParaLembrar[], tempos: Map<string, Tempos>, agora: Date): string[] {
  return doses
    .filter((d) => {
      if (d.confirmadoEm || d.lembreteEm) return false;
      const atraso = agora.getTime() - Date.parse(d.previstoEm);
      const tolerancia = (tempos.get(d.pacienteId)?.toleranciaDoseMin ?? 30) * MINUTO;
      return atraso >= 0 && atraso < tolerancia;
    })
    .map((d) => d.id);
}

export function notificacaoDoRemedio(doseId: string, nomeRemedio: string, dose: string | null): Notificacao {
  return {
    titulo: 'Hora do remédio',
    corpo: dose ? `${nomeRemedio}, ${dose}. Toque para confirmar.` : `${nomeRemedio}. Toque para confirmar.`,
    url: '/',
    etiqueta: `dose-${doseId}`,
    urgente: true,
  };
}

/** Já passou o horário, não houve check-in hoje e o lembrete de hoje ainda não saiu. */
export function deveLembrarCheckin(
  horario: string,
  agora: Date,
  ultimoCheckinEm: string | null,
  lembreteEm: string | null,
  tempos?: Tempos,
): boolean {
  let s;
  try {
    s = situacaoDoCheckin(horario, agora, ultimoCheckinEm, tempos);
  } catch {
    return false; // horário inválido: o servidor ignora (como em checkin.ts)
  }
  if (!s.aguardando) return false;
  return !lembreteEm || dataLocal(lembreteEm) !== dataLocal(agora.toISOString());
}

function saudacao(agora: Date): string {
  const h = new Date(agora.getTime() + FUSO * MINUTO).getUTCHours();
  return h >= 5 && h < 12 ? 'Bom dia' : h >= 12 && h < 18 ? 'Boa tarde' : 'Boa noite';
}

export function notificacaoDoCheckin(apelido: string, agora: Date): Notificacao {
  return {
    titulo: `${saudacao(agora)}, ${apelido}!`,
    corpo: 'Como você está hoje? Toque para responder.',
    url: '/',
    etiqueta: 'checkin',
    urgente: false,
  };
}

/**
 * "Reenviar lembrete" (tela do alerta da família): o que vai para o celular do idoso.
 * Dose → o lembrete do remédio; check-in → o do check-in; outros → um chamado para abrir o Cuida.
 */
export function notificacaoDeReenvio(
  gatilho: string,
  apelido: string,
  agora: Date,
  dose?: { id: string; nomeRemedio: string; dose: string | null } | null,
): Notificacao {
  if (gatilho.startsWith('dose.') && dose) return notificacaoDoRemedio(dose.id, dose.nomeRemedio, dose.dose);
  if (gatilho === 'geral.checkin_sem_resposta') return notificacaoDoCheckin(apelido, agora);
  return {
    titulo: `${apelido}, sua família quer saber de você`,
    corpo: 'Abra o Cuida e fale com a Lia.',
    url: '/',
    etiqueta: 'familia-chamou',
    urgente: true,
  };
}

// Consultas (docs/PRD.md, seção 7): lembrete ao idoso no dia anterior (a partir das 10h) e 3 horas antes.
export interface ConsultaParaLembrar {
  id: string;
  quando: string;
  lembreteVesperaEm: string | null;
  lembreteHorasEm: string | null;
}

export type TipoLembreteConsulta = 'vespera' | 'horas';

const HORAS_ANTES = 3;
const HORA_DA_VESPERA = 10;

/** Quais lembretes de consulta saem agora (cada um uma vez; perto da consulta, só o de "horas"). */
export function consultasParaLembrar(
  consultas: ConsultaParaLembrar[],
  agora: Date,
): { id: string; tipo: TipoLembreteConsulta }[] {
  const t = agora.getTime();
  const horaLocal = new Date(t + FUSO * MINUTO).getUTCHours();
  const hoje = dataLocal(agora.toISOString());
  const resultado: { id: string; tipo: TipoLembreteConsulta }[] = [];
  for (const c of consultas) {
    const q = Date.parse(c.quando);
    if (!(q > t)) continue;
    if (q - t <= HORAS_ANTES * 60 * MINUTO) {
      if (!c.lembreteHorasEm) resultado.push({ id: c.id, tipo: 'horas' });
      continue;
    }
    const vespera = dataLocal(new Date(q - 24 * 60 * MINUTO).toISOString());
    if (!c.lembreteVesperaEm && vespera === hoje && horaLocal >= HORA_DA_VESPERA) resultado.push({ id: c.id, tipo: 'vespera' });
  }
  return resultado;
}

function horaCurtaLocal(iso: string): string {
  const d = new Date(Date.parse(iso) + FUSO * MINUTO);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export function notificacaoDaConsulta(
  tipo: TipoLembreteConsulta,
  apelido: string,
  c: { id: string; quando: string; medico: string | null; especialidade: string | null; local: string | null },
): Notificacao {
  const com = [c.medico?.trim(), c.especialidade?.trim()].filter(Boolean).join(', ') || 'médico';
  const onde = c.local?.trim() ? ` Local: ${c.local.trim()}.` : '';
  return {
    titulo: tipo === 'vespera' ? `${apelido}, amanhã tem consulta` : `${apelido}, hoje tem consulta`,
    corpo: `Às ${horaCurtaLocal(c.quando)}, com ${com}.${onde}`,
    url: '/',
    etiqueta: `consulta-${c.id}-${tipo}`,
    urgente: tipo === 'horas',
  };
}

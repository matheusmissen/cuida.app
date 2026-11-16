// Check-in diário sem resposta: a decisão é do motor de regras (situacaoDoCheckin →
// avaliarCheckinSemResposta); aqui só se evita repetir o aviso no mesmo dia.

import { dataLocal, situacaoDoCheckin, type Alerta } from '../../../packages/regras/src/index.ts';

export interface PacienteCheckin {
  id: string;
  /** 'HH:MM:SS' (Postgres time) ou null quando a família desligou o check-in. */
  horarioCheckin: string | null;
  ultimoCheckinEm: string | null;
}

export interface CheckinSemResposta {
  pacienteId: string;
  alerta: Alerta;
}

/**
 * @param ultimoAviso paciente_id → criado_em do alerta 'geral.checkin_sem_resposta' mais recente
 */
export function checkinsSemResposta(
  pacientes: PacienteCheckin[],
  ultimoAviso: Map<string, string>,
  agora: Date,
): CheckinSemResposta[] {
  const hoje = dataLocal(agora.toISOString());
  const resultado: CheckinSemResposta[] = [];
  for (const p of pacientes) {
    if (!p.horarioCheckin) continue;
    let situacao;
    try {
      situacao = situacaoDoCheckin(p.horarioCheckin, agora, p.ultimoCheckinEm);
    } catch (erro) {
      console.error('checkin: horário inválido', p.id, erro instanceof Error ? erro.message : erro);
      continue;
    }
    if (!situacao.alerta) continue;
    const aviso = ultimoAviso.get(p.id);
    if (aviso && dataLocal(aviso) === hoje) continue; // já avisou hoje
    resultado.push({ pacienteId: p.id, alerta: situacao.alerta });
  }
  return resultado;
}

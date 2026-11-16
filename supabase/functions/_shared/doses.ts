// Decide o que fazer com as doses atrasadas. Quem decide é o motor de regras
// (packages/regras, avaliarDose); aqui só aplicamos a configuração do paciente.

import { avaliarDose, type Alerta, type Nivel } from '../../../packages/regras/src/index.ts';

export interface DoseLinha {
  id: string;
  pacienteId: string;
  previstoEm: string;
  confirmadoEm: string | null;
  realarmadoEm: string | null;
  critico: boolean;
  nomeRemedio: string;
}

/** Linha da tabela `regras`: a família pode subir o nível ou desativar o aviso. */
export interface RegraPaciente {
  id: string;
  pacienteId: string;
  gatilho: string;
  nivel: Nivel;
  ativa: boolean;
}

export interface DosePerdida {
  doseId: string;
  pacienteId: string;
  alerta: Alerta;
  regraId: string | null;
}

export interface PlanoDoses {
  /** Doses que devem tocar o alarme de novo (30 min sem confirmação). */
  realarmar: string[];
  /** Doses que viram alerta para a família (60 min sem confirmação). */
  perdidas: DosePerdida[];
}

const PESO: Record<Nivel, number> = { vermelho: 3, laranja: 2, amarelo: 1, informativo: 0 };

/**
 * Aplica a regra do paciente ao alerta do motor.
 * Na dúvida, sobe: o nível final é o maior entre o do motor e o da regra.
 * Regra desativada não apaga o fato: o alerta fica só no histórico (informativo, sem push).
 */
export function aplicarRegraDoPaciente(
  alerta: Alerta,
  regra?: RegraPaciente,
): { alerta: Alerta; regraId: string | null } {
  if (!regra) return { alerta, regraId: null };
  if (!regra.ativa) return { alerta: { ...alerta, nivel: 'informativo' }, regraId: regra.id };
  const nivel = PESO[regra.nivel] > PESO[alerta.nivel] ? regra.nivel : alerta.nivel;
  return { alerta: { ...alerta, nivel }, regraId: regra.id };
}

export function planejarDoses(doses: DoseLinha[], regras: RegraPaciente[], agora: Date): PlanoDoses {
  const plano: PlanoDoses = { realarmar: [], perdidas: [] };
  for (const dose of doses) {
    const acao = avaliarDose(
      {
        previstoEm: dose.previstoEm,
        confirmadoEm: dose.confirmadoEm,
        critico: dose.critico,
        nomeRemedio: dose.nomeRemedio,
      },
      agora,
    );
    if (acao.acao === 'realarmar' && !dose.realarmadoEm) {
      plano.realarmar.push(dose.id);
    } else if (acao.acao === 'alertar') {
      const regra = regras.find((r) => r.pacienteId === dose.pacienteId && r.gatilho === acao.alerta.gatilho);
      const { alerta, regraId } = aplicarRegraDoPaciente(acao.alerta, regra);
      plano.perdidas.push({ doseId: dose.id, pacienteId: dose.pacienteId, alerta, regraId });
    }
  }
  return plano;
}

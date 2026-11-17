// Decide o que fazer com as doses atrasadas. Quem decide é o motor de regras
// (packages/regras, avaliarDose); aqui só aplicamos a configuração do paciente
// (tempos de tolerância e regras da família).

import { avaliarDose, TEMPOS_PADRAO, type Alerta, type Nivel, type Tempos } from '../../../packages/regras/src/index.ts';

export interface DoseLinha {
  id: string;
  pacienteId: string;
  previstoEm: string;
  confirmadoEm: string | null;
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
  /** Doses que viram alerta para a família (sem "Tomei" até a tolerância do paciente). */
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

/**
 * @param tempos paciente_id → tempos do paciente (sem entrada: padrão do PRD, 30 min)
 */
export function planejarDoses(
  doses: DoseLinha[],
  regras: RegraPaciente[],
  agora: Date,
  tempos: Map<string, Tempos> = new Map(),
): PlanoDoses {
  const plano: PlanoDoses = { perdidas: [] };
  for (const dose of doses) {
    const acao = avaliarDose(
      {
        previstoEm: dose.previstoEm,
        confirmadoEm: dose.confirmadoEm,
        critico: dose.critico,
        nomeRemedio: dose.nomeRemedio,
      },
      agora,
      tempos.get(dose.pacienteId) ?? TEMPOS_PADRAO,
    );
    if (acao.acao !== 'alertar') continue;
    const regra = regras.find((r) => r.pacienteId === dose.pacienteId && r.gatilho === acao.alerta.gatilho);
    const { alerta, regraId } = aplicarRegraDoPaciente(acao.alerta, regra);
    plano.perdidas.push({ doseId: dose.id, pacienteId: dose.pacienteId, alerta, regraId });
  }
  return plano;
}

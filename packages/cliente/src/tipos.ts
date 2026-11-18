// Linhas das tabelas usadas pelos apps (a migration é a fonte da verdade).
import type { Nivel } from '@cuida/regras';

export type StatusDose = 'pendente' | 'tomado' | 'perdido';

export interface Paciente {
  id: string;
  usuario_id: string | null;
  nome: string;
  apelido: string | null;
  /** Códigos do catálogo de condicoes.ts; só eles ligam modelos de alerta. */
  condicoes: string[];
  /** Texto livre da família; fica registrado e nunca gera alerta. */
  outras_condicoes: string | null;
  limite_febre: number;
  ultima_interacao_em: string | null;
  /** 'HH:MM:SS', horário local do check-in diário da Lia; null = desligado. */
  horario_checkin: string | null;
  /** Tempos de tolerância e escalada em minutos (leia com temposDoPaciente, de @cuida/regras). */
  tolerancia_dose_min: number;
  tolerancia_checkin_min: number;
  escalada_min: number;
  /** Telefone do idoso (só dígitos), para "Ligar para o idoso". */
  telefone: string | null;
  /** Consentimento do idoso por finalidade (null = não concordou ou ainda não respondeu). */
  consente_registro_em?: string | null;
  consente_familia_em?: string | null;
  consente_lia_em?: string | null;
  /** Quando o idoso respondeu a tela de consentimento (null = aguardando). */
  consentimento_respondido_em?: string | null;
}

/** Colunas de `pacientes` que os apps leem. */
export const SELECT_PACIENTE =
  'id, usuario_id, nome, apelido, condicoes, outras_condicoes, limite_febre, ultima_interacao_em, horario_checkin, tolerancia_dose_min, tolerancia_checkin_min, escalada_min, telefone, consente_registro_em, consente_familia_em, consente_lia_em, consentimento_respondido_em';

export interface Remedio {
  id: string;
  paciente_id: string;
  nome: string;
  dose: string;
  foto_url: string | null;
  critico: boolean;
  estoque_doses: number | null;
  ativo: boolean;
}

export interface Horario {
  id: string;
  remedio_id: string;
  paciente_id: string;
  /** 'HH:MM:SS' */
  hora: string;
  dias_semana: number[];
}

export interface DoseComRemedio {
  id: string;
  horario_id: string;
  paciente_id: string;
  previsto_em: string;
  confirmado_em: string | null;
  realarmado_em: string | null;
  status: StatusDose;
  horarios: { remedios: Pick<Remedio, 'id' | 'nome' | 'dose' | 'foto_url' | 'critico'> };
}

export interface AlertaLinha {
  id: string;
  paciente_id: string;
  gatilho: string;
  nivel: Nivel;
  motivo: string;
  criado_em: string;
  visto_em: string | null;
  /** Quem já foi avisado (usuario_id dos cuidadores). */
  avisados: string[];
  /** Última ação do responsável ("Reenviar lembrete"). */
  acao_em: string | null;
  /** Como foi resolvido: 'familia', 'tomou' ou 'checkin'. */
  resolucao: 'familia' | 'tomou' | 'checkin' | null;
  /** Dose que gerou o alerta (alertas de dose). */
  dose_id: string | null;
}

/** Colunas de `alertas` que o app da família lê. */
export const SELECT_ALERTA = 'id, paciente_id, gatilho, nivel, motivo, criado_em, visto_em, avisados, acao_em, resolucao, dose_id';

/** Select do PostgREST que traz o remédio junto com a dose. */
export const SELECT_DOSE =
  'id, horario_id, paciente_id, previsto_em, confirmado_em, realarmado_em, status, horarios!inner(remedios!inner(id, nome, dose, foto_url, critico))';

/** Linha de `checkins` (a migration é a fonte da verdade). */
export interface CheckinLinha {
  id: string;
  paciente_id: string;
  feito_em: string;
  febre: boolean | null;
  temperatura: number | null;
  calafrio: boolean | null;
  sangramento: boolean | null;
  manchas: boolean | null;
  sinais_infeccao: boolean | null;
  cansaco: 'nenhum' | 'leve' | 'forte' | null;
  humor: 'bom' | 'regular' | 'baixo' | null;
  apetite_baixo: boolean | null;
  nausea: boolean | null;
  queda: boolean | null;
  dor_no_peito: boolean | null;
  falta_de_ar: boolean | null;
  confuso: boolean | null;
  sono: string | null;
  notas: string | null;
  /** Rostinho do check-in: 1 = muito bem … 6 = muito mal (nulo nos registros da conversa com a Lia). */
  nivel?: number | null;
}

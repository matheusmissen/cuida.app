// Linhas das tabelas usadas pelos apps (a migration é a fonte da verdade).
import type { Nivel } from '@cuida/regras';

export type StatusDose = 'pendente' | 'tomado' | 'perdido';

export interface Paciente {
  id: string;
  usuario_id: string | null;
  nome: string;
  apelido: string | null;
  condicoes: string[];
  limite_febre: number;
  ultima_interacao_em: string | null;
}

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
}

/** Select do PostgREST que traz o remédio junto com a dose. */
export const SELECT_DOSE =
  'id, horario_id, paciente_id, previsto_em, confirmado_em, realarmado_em, status, horarios!inner(remedios!inner(id, nome, dose, foto_url, critico))';

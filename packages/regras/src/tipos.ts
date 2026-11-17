// Tipos do motor de regras de alerta.
// As regras são código determinístico: o LLM só preenche estes campos a partir da fala.

export type Nivel = 'vermelho' | 'laranja' | 'amarelo' | 'informativo';

export type Cansaco = 'nenhum' | 'leve' | 'forte';
export type Humor = 'bom' | 'regular' | 'baixo';

/** Um check-in já estruturado (espelha a tabela `checkins`). */
export interface Checkin {
  /** Data e hora em ISO 8601, por exemplo '2026-11-20T09:05:00-03:00'. */
  feitoEm: string;
  febre?: boolean;
  temperatura?: number | null;
  calafrio?: boolean;
  sangramento?: boolean;
  manchas?: boolean;
  sinaisInfeccao?: boolean;
  cansaco?: Cansaco;
  humor?: Humor;
  apetiteBaixo?: boolean;
  nausea?: boolean;
  queda?: boolean;
  dorNoPeito?: boolean;
  faltaDeAr?: boolean;
  confuso?: boolean;
}

/** Configuração clínica do paciente, definida pela família com o médico. */
export interface ConfigPaciente {
  /** Condições ativas, por exemplo ['leucemia']. */
  condicoes: string[];
  /** Temperatura (°C) a partir da qual há febre. Padrão: 37,8. Validar com o médico. */
  limiteFebre?: number;
  /** Deslocamento do fuso em minutos. Padrão: -180 (Brasília). */
  fusoMinutos?: number;
}

export interface Alerta {
  nivel: Nivel;
  /** Identificador estável da regra, por exemplo 'leucemia.febre'. */
  gatilho: string;
  /** Frase curta para a família, em português. */
  motivo: string;
}

/** Uma dose prevista (espelha a tabela `doses` + o campo `critico` do remédio). */
export interface Dose {
  previstoEm: string;
  confirmadoEm?: string | null;
  /** Não muda mais o nível do alerta (PRD); fica para a família identificar o remédio. */
  critico?: boolean;
  nomeRemedio: string;
}

export type AcaoDose = { acao: 'nenhuma' } | { acao: 'alertar'; alerta: Alerta };

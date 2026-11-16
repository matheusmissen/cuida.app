// Geração das doses do dia a partir dos horários cadastrados. Lógica pura, testada em Node.

export interface Horario {
  id: string;
  paciente_id: string;
  /** 'HH:MM' ou 'HH:MM:SS', no horário local do paciente. */
  hora: string;
  /** 0 = domingo ... 6 = sábado */
  dias_semana: number[];
}

export interface NovaDose {
  horario_id: string;
  paciente_id: string;
  previsto_em: string;
}

const MINUTO = 60_000;

/** Dia da semana (0 = domingo) de uma data local AAAA-MM-DD. */
export function diaDaSemana(data: string): number {
  return new Date(`${data}T12:00:00Z`).getUTCDay();
}

/** Converte data + hora locais em instante ISO (UTC). */
export function instanteLocal(data: string, hora: string, fusoMinutos = -180): string {
  const [ano, mes, dia] = data.split('-').map(Number);
  const [h, m] = hora.split(':').map(Number);
  if ([ano, mes, dia, h, m].some((n) => Number.isNaN(n))) {
    throw new Error(`Data ou hora inválida: ${data} ${hora}`);
  }
  return new Date(Date.UTC(ano, mes - 1, dia, h, m) - fusoMinutos * MINUTO).toISOString();
}

/** Doses previstas para uma data local. A tabela `doses` tem unique (horario_id, previsto_em). */
export function gerarDosesDoDia(horarios: Horario[], data: string, fusoMinutos = -180): NovaDose[] {
  const dia = diaDaSemana(data);
  return horarios
    .filter((h) => h.dias_semana.includes(dia))
    .map((h) => ({
      horario_id: h.id,
      paciente_id: h.paciente_id,
      previsto_em: instanteLocal(data, h.hora, fusoMinutos),
    }))
    .sort((a, b) => a.previsto_em.localeCompare(b.previsto_em));
}

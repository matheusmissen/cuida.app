// Consultas (docs/PRD.md, seção 7): a família cadastra; o idoso vê a próxima em destaque e recebe
// lembretes (no dia anterior e 3 horas antes, pela verificar-doses). Lógica pura, no horário de Brasília.
import { dataLocal } from '@cuida/regras';

export interface ConsultaLinha {
  id: string;
  paciente_id: string;
  /** ISO 8601. */
  quando: string;
  medico: string | null;
  especialidade: string | null;
  local: string | null;
  observacao: string | null;
}

export const SELECT_CONSULTA = 'id, paciente_id, quando, medico, especialidade, local, observacao';

const HORA = 3_600_000;
const DIA = 24 * HORA;
const FUSO_MS = -3 * HORA; // Brasília, sem horário de verão

/** A próxima consulta (vale até 1 hora depois do horário, enquanto ela acontece). */
export function proximaConsulta<T extends Pick<ConsultaLinha, 'quando'>>(consultas: T[], agora: Date): T | null {
  return (
    consultas
      .filter((c) => Date.parse(c.quando) >= agora.getTime() - HORA)
      .sort((a, b) => Date.parse(a.quando) - Date.parse(b.quando))[0] ?? null
  );
}

/** Próxima consulta só se for em até `dias` dias (o idoso vê só o que está perto). */
export function consultaPerto<T extends Pick<ConsultaLinha, 'quando'>>(consultas: T[], agora: Date, dias = 7): T | null {
  const c = proximaConsulta(consultas, agora);
  return c && Date.parse(c.quando) - agora.getTime() <= dias * DIA ? c : null;
}

function horaLocal(iso: string): string {
  const d = new Date(Date.parse(iso) + FUSO_MS);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

/** "Hoje às 14:00", "Amanhã às 09:30" ou "Sábado, 28/11, às 10:00". */
export function quandoPorExtenso(iso: string, agora: Date): string {
  const dia = dataLocal(iso);
  const hoje = dataLocal(agora.toISOString());
  const amanha = dataLocal(new Date(agora.getTime() + DIA).toISOString());
  const hora = horaLocal(iso);
  if (dia === hoje) return `Hoje às ${hora}`;
  if (dia === amanha) return `Amanhã às ${hora}`;
  const d = new Date(Date.parse(iso) + FUSO_MS);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${DIAS_SEMANA[d.getUTCDay()]}, ${dd}/${mm}, às ${hora}`;
}

/** "Dra. Ana (Hematologia)", "Hematologia" ou "Dra. Ana". */
export function comQuem(c: Pick<ConsultaLinha, 'medico' | 'especialidade'>): string {
  const medico = c.medico?.trim();
  const esp = c.especialidade?.trim();
  if (medico && esp) return `${medico} (${esp})`;
  return medico || esp || 'Consulta';
}

/**
 * Lê "28/11" ou "28/11/2026" e devolve "2026-11-28". Sem o ano: este ano ou, se a data já passou, o próximo.
 */
export function lerDataDaConsulta(texto: string, agora: Date): string | null {
  const m = texto.trim().match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const hoje = dataLocal(agora.toISOString());
  let ano = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : Number(hoje.slice(0, 4));
  const montar = (a: number) => `${a}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  const valida = (ymd: string) => {
    const d = new Date(`${ymd}T12:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === ymd;
  };
  if (mes < 1 || mes > 12 || dia < 1 || !valida(montar(ano))) return null;
  if (!m[3] && montar(ano) < hoje) ano += 1;
  return valida(montar(ano)) ? montar(ano) : null;
}

/** Junta "2026-11-28" e "14:30" no instante de Brasília (ISO). */
export function instanteDaConsulta(dataYmd: string, hora: string): string {
  return new Date(`${dataYmd}T${hora}:00-03:00`).toISOString();
}

// Formatação em português do Brasil.
import type { Nivel } from '@cuida/regras';

export const FUSO = 'America/Sao_Paulo';

/** '08:00' a partir de um instante ISO, no horário de Brasília. */
export function horaCurta(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: FUSO }).format(
    new Date(iso),
  );
}

/** '08:00' a partir de um campo time do Postgres ('08:00:00'). */
export function horaDoBanco(hora: string): string {
  return hora.slice(0, 5);
}

/** Lê '8', '8h', '08:00', '8:30' e devolve 'HH:MM', ou null se inválido. */
export function lerHora(texto: string): string | null {
  const m = texto.trim().toLowerCase().match(/^(\d{1,2})(?:[:h](\d{2})?)?h?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** 'Quinta, 20 de novembro' (dia da semana sem '-feira'), no horário de Brasília. */
export function dataCurta(agora: Date): string {
  const partes = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: FUSO })
    .formatToParts(agora)
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  const dia = partes.weekday.replace('-feira', '');
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, ${partes.day} de ${partes.month}`;
}

/** 'Bom dia', 'Boa tarde' ou 'Boa noite', no horário de Brasília. */
export function saudacao(agora: Date): string {
  const h = Number(new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hourCycle: 'h23', timeZone: FUSO }).format(agora));
  if (h >= 5 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export const NIVEIS: Record<Nivel, { rotulo: string; cor: string; fundo: string }> = {
  vermelho: { rotulo: 'Urgente', cor: '#B00020', fundo: '#FDE7EA' },
  laranja: { rotulo: 'Atenção', cor: '#B45309', fundo: '#FEF0DC' },
  amarelo: { rotulo: 'Acompanhar', cor: '#8A6D00', fundo: '#FFF8D6' },
  informativo: { rotulo: 'Histórico', cor: '#475569', fundo: '#EEF2F6' },
};

/**
 * Separa o motivo de um alerta em título curto e explicação, para a tela de alerta.
 * 'Febre ou calafrio (38,2 °C). Em tratamento de leucemia, procurar o médico.' →
 * { titulo: 'Febre ou calafrio (38,2 °C)', detalhe: 'Em tratamento de leucemia, procurar o médico.' }
 */
export function dividirMotivo(motivo: string): { titulo: string; detalhe: string | null } {
  const texto = motivo.trim();
  const i = texto.search(/\.\s+\S/);
  if (i < 0) return { titulo: texto.replace(/\.$/, ''), detalhe: null };
  return { titulo: texto.slice(0, i), detalhe: texto.slice(i + 1).trim() };
}

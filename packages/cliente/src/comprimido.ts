// Como é o remédio (docs/PRD.md, seção 5): cor e formato do comprimido e foto da caixa, para o idoso
// reconhecer na hora do remédio. Os códigos são os mesmos da migration 20261130160000_hora_do_remedio.sql.

export interface CorComprimido {
  codigo: string;
  /** Adjetivo no masculino, como em "comprimido branco". */
  nome: string;
  /** Cor do desenho na tela (ilustração, nunca a única informação: o nome vai escrito). */
  hex: string;
}

export const CORES_COMPRIMIDO: CorComprimido[] = [
  { codigo: 'branco', nome: 'branco', hex: '#FFFFFF' },
  { codigo: 'amarelo', nome: 'amarelo', hex: '#F6D35B' },
  { codigo: 'laranja', nome: 'laranja', hex: '#F2994A' },
  { codigo: 'rosa', nome: 'rosa', hex: '#F4A7C0' },
  { codigo: 'vermelho', nome: 'vermelho', hex: '#D9534F' },
  { codigo: 'azul', nome: 'azul', hex: '#5B8DEF' },
  { codigo: 'verde', nome: 'verde', hex: '#6BBF7A' },
  { codigo: 'marrom', nome: 'marrom', hex: '#9C6B4E' },
  { codigo: 'colorido', nome: 'de duas cores', hex: '#B49AE6' },
];

export type TipoFormato = 'comprimido' | 'capsula' | 'liquido' | 'outro';

export interface FormatoComprimido {
  codigo: string;
  nome: string;
  tipo: TipoFormato;
}

export const FORMATOS_COMPRIMIDO: FormatoComprimido[] = [
  { codigo: 'redondo', nome: 'Comprimido redondo', tipo: 'comprimido' },
  { codigo: 'oval', nome: 'Comprimido comprido', tipo: 'comprimido' },
  { codigo: 'capsula', nome: 'Cápsula', tipo: 'capsula' },
  { codigo: 'gotas', nome: 'Gotas', tipo: 'liquido' },
  { codigo: 'liquido', nome: 'Líquido (xarope)', tipo: 'liquido' },
  { codigo: 'outro', nome: 'Outro', tipo: 'outro' },
];

export const corDoComprimido = (codigo?: string | null) => CORES_COMPRIMIDO.find((c) => c.codigo === codigo) ?? null;
export const formatoDoComprimido = (codigo?: string | null) => FORMATOS_COMPRIMIDO.find((f) => f.codigo === codigo) ?? null;

/**
 * Descrição curta para a tela e para a voz: "Comprimido redondo branco", "Cápsula azul", "Gotas".
 * Em gotas e xarope a cor não ajuda a reconhecer e fica de fora. Sem cor nem formato: null.
 */
export function descricaoDoComprimido(cor?: string | null, formato?: string | null): string | null {
  const c = corDoComprimido(cor);
  const f = formatoDoComprimido(formato);
  if (f?.tipo === 'liquido') return f.nome;
  if (f && f.tipo !== 'outro') return c ? `${f.nome} ${c.nome}` : f.nome;
  if (c) return `Comprimido ${c.nome}`;
  return null;
}

/** Caminho da foto da caixa no bucket `remedios`: a pasta é o paciente (a regra de acesso usa isso). */
export function caminhoDaFotoRemedio(pacienteId: string, mime: string, aleatorio: string): string {
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  return `${pacienteId}/caixa-${aleatorio}.${ext}`;
}

// "Me lembre daqui a 10 minutos" (tela 7 do idoso). O alarme some e volta depois; a família continua
// sendo avisada pela regra de sempre (tolerância da dose), porque adiar não é tomar.
export const ADIAR_MINUTOS = 10;

/** dose_id → instante (ISO) até quando o alarme fica escondido. */
export type Adiamentos = Record<string, string>;

export function adiar(adiamentos: Adiamentos, doseId: string, agora: Date, minutos = ADIAR_MINUTOS): Adiamentos {
  const limpos = Object.fromEntries(Object.entries(adiamentos).filter(([, ate]) => Date.parse(ate) > agora.getTime()));
  return { ...limpos, [doseId]: new Date(agora.getTime() + minutos * 60_000).toISOString() };
}

export function estaAdiada(adiamentos: Adiamentos, doseId: string, agora: Date): boolean {
  const ate = adiamentos[doseId];
  return Boolean(ate) && Date.parse(ate) > agora.getTime();
}

/** Como a Lia fala o formato: "o comprimido redondo branco", "a cápsula azul", "em gotas", "o xarope". */
export function comoFalarOComprimido(cor?: string | null, formato?: string | null): string | null {
  const f = formatoDoComprimido(formato);
  if (f?.codigo === 'gotas') return 'em gotas';
  if (f?.codigo === 'liquido') return 'o xarope';
  const texto = descricaoDoComprimido(cor, formato);
  if (!texto) return null;
  return f?.tipo === 'capsula' ? `a ${texto.toLowerCase()}` : `o ${texto.toLowerCase()}`;
}

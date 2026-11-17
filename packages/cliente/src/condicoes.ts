// Condições de saúde do cadastro do paciente.
//
// Só códigos desta lista vão para `pacientes.condicoes`. As regras de alerta (packages/regras) são
// determinísticas e reconhecem códigos exatos: um texto livre como "câncer no sangue" nunca ligaria o
// modelo de leucemia. Por isso o que não está na lista vai para `pacientes.outras_condicoes`, que fica
// registrado para a família e o médico e NUNCA gera alerta.
//
// `alertas` preenchido = a condição tem modelo de alertas próprio. As demais são só registro: a tela
// precisa deixar isso claro para a família não achar que está protegida quando não está.

export interface Condicao {
  codigo: string;
  rotulo: string;
  /** Frase curta do que a condição ativa; ausente = só registro, sem alertas próprios. */
  alertas?: string;
}

export const CONDICOES: readonly Condicao[] = [
  { codigo: 'leucemia', rotulo: 'Leucemia em tratamento', alertas: 'Ativa alertas de febre, sangramento e manchas roxas' },
  { codigo: 'diabetes', rotulo: 'Diabetes' },
  { codigo: 'hipertensao', rotulo: 'Pressão alta' },
  { codigo: 'doenca_cardiaca', rotulo: 'Doença do coração' },
  { codigo: 'doenca_pulmonar', rotulo: 'Doença pulmonar (asma, DPOC)' },
];

export const CONDICOES_COM_ALERTAS = CONDICOES.filter((c) => c.alertas);
export const CONDICOES_SO_REGISTRO = CONDICOES.filter((c) => !c.alertas);

/** Tamanho máximo do texto livre (o banco confere o mesmo limite). */
export const MAX_OUTRAS_CONDICOES = 300;

const CODIGOS = new Set(CONDICOES.map((c) => c.codigo));

/** Mantém só códigos conhecidos, sem repetir, na ordem do catálogo. */
export function normalizarCondicoes(selecionadas: readonly string[]): string[] {
  const marcadas = new Set(selecionadas.filter((c) => CODIGOS.has(c)));
  return CONDICOES.map((c) => c.codigo).filter((c) => marcadas.has(c));
}

/** Texto livre limpo (espaços simples, até o limite) ou null quando vazio. */
export function limparOutrasCondicoes(texto: string | null | undefined): string | null {
  const limpo = (texto ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_OUTRAS_CONDICOES);
  return limpo.length > 0 ? limpo : null;
}

/**
 * O que gravar a partir do formulário. Com "Não" na pergunta "Possui alguma doença?",
 * grava tudo vazio, mesmo que algo tenha ficado marcado antes de trocar a resposta.
 */
export function condicoesParaSalvar(form: {
  possui: boolean;
  selecionadas: readonly string[];
  outras: string;
}): { condicoes: string[]; outras_condicoes: string | null } {
  if (!form.possui) return { condicoes: [], outras_condicoes: null };
  return { condicoes: normalizarCondicoes(form.selecionadas), outras_condicoes: limparOutrasCondicoes(form.outras) };
}

/** Rótulos legíveis para mostrar na tela, incluindo o texto livre no fim. */
export function descreverCondicoes(condicoes: readonly string[], outras: string | null): string[] {
  const rotulos = normalizarCondicoes(condicoes).map((c) => CONDICOES.find((x) => x.codigo === c)!.rotulo);
  return outras ? [...rotulos, outras] : rotulos;
}

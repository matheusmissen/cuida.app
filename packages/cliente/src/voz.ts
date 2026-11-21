// Qual voz a Lia usa (toda resposta dela sai em voz). Lógica pura, testada em Node.
// O navegador e o celular trazem várias vozes; sem escolher, alguns usam a primeira em português,
// que pode ser a de Portugal. Aqui fica a escolha: só português do Brasil, de preferência uma voz
// feminina e "natural" (as mais humanas). Sem nenhuma voz do Brasil, devolve null e o aparelho decide.

export interface VozDisponivel {
  /** Identificador que o expo-speech usa para falar com esta voz (na web, o voiceURI). */
  identifier: string;
  name: string;
  /** Ex.: 'pt-BR', 'pt_BR', 'pt-PT'. */
  language: string;
  localService?: boolean;
}

/** Vozes femininas conhecidas do Brasil, da mais natural para a menos (Edge, Chrome, Apple, Windows). */
const PREFERIDAS = ['francisca', 'thalita', 'google português do brasil', 'luciana', 'leticia', 'manuela', 'yara', 'brenda', 'elza', 'giovanna', 'leila', 'maria', 'vitoria'];
/** Vozes masculinas conhecidas: só se não houver outra do Brasil. */
const MASCULINAS = ['antonio', 'daniel', 'felipe', 'donato', 'fabio', 'humberto', 'julio', 'nicolau', 'valerio'];

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function ehPortuguesDoBrasil(language: string): boolean {
  return language.replace('_', '-').toLowerCase() === 'pt-br';
}

function pontos(v: VozDisponivel): number {
  const nome = semAcento(v.name);
  let p = 0;
  if (/natural|online|neural|enhanced|premium|aprimorad/.test(nome)) p += 100;
  const i = PREFERIDAS.findIndex((n) => nome.includes(semAcento(n)));
  if (i >= 0) p += 60 - i;
  if (MASCULINAS.some((n) => new RegExp(`\\b${n}\\b`).test(nome))) p -= 200;
  return p;
}

/** Identificador da melhor voz do Brasil, ou null se não houver nenhuma (aí vale o idioma 'pt-BR'). */
export function escolherVozDaLia(vozes: VozDisponivel[]): string | null {
  const doBrasil = vozes.filter((v) => ehPortuguesDoBrasil(v.language));
  if (doBrasil.length === 0) return null;
  return [...doBrasil].sort((a, b) => pontos(b) - pontos(a))[0].identifier;
}

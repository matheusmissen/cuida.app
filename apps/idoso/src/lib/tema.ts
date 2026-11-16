// Tema "Manhã Clara" do app do idoso, gerado de docs/design/tokens.json (fonte da verdade).
// Regras: nenhum texto abaixo de 20 pt; toques de 64 ou mais; vermelho só para alertas e ajuda.
import tokens from '../../../../docs/design/tokens.json';

export const cores = tokens.cores;
export const tamanhos = tokens.tamanhos.idoso;
export const raios = tokens.raios;
export const alvos = tokens.alvos;
export const sombras = tokens.sombras;
export const espacos = tokens.espacos;

/** Nomes das fontes carregadas em app/_layout.tsx (um arquivo por peso). */
export const fontes = {
  texto: 'AtkinsonHyperlegible_400Regular',
  textoNegrito: 'AtkinsonHyperlegible_700Bold',
  destaque: 'Outfit_500Medium',
} as const;

/** Garante o mínimo de 20 pt do app do idoso, mesmo se alguém passar um tamanho menor. */
export const tamanhoIdoso = (pt: number) => Math.max(tamanhos.minimo, pt);

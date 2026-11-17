// Tema "Manhã Clara" do app da família, gerado de docs/design/tokens.json (fonte da verdade).
// Corpo de 15 a 17 pt; 13–14 pt só em selos de status em negrito. Vermelho só para alertas.
import tokens from '../../../../docs/design/tokens.json';

export const paleta = tokens.cores;
export const tamanhos = tokens.tamanhos.familia;
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

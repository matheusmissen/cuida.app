// Tema do app da família na Variação E (docs/design.md), com os nomes que as telas já usavam.
// Os valores vêm todos de @cuida/visual (packages/visual/src/tema.ts): nenhuma cor é copiada aqui.
// Cartões têm borda visível (feita com box-shadow de 1,5 px, para não mudar o tamanho) e não têm sombra.
import { bordas, cores, fontes as fontesE, pasteis, raios as raiosE, tamanhos as tamanhosE } from '@cuida/visual';

export const paleta = {
  fundo: cores.fundo,
  cartao: cores.superficie,
  divisor: cores.borda,
  bordaCampo: cores.bordaCampo,
  /** Fundo neutro de selos e chips ("Mais tarde", "Guardado"): o creme do fundo. */
  superficieNeutra: cores.fundo,
  /** Texto principal. Para fundos de botões, abas e itens ativos, use `primaria`. */
  tinta: cores.texto,
  primaria: cores.primaria,
  textoSecundario: cores.textoSuave,
  textoSuave: cores.textoSuave,
  sobreTinta: cores.sobrePrimaria,
  /** Sucesso e "tomou": o par menta. */
  salvia: {
    fundo: pasteis.menta.fundo,
    fundoClaro: pasteis.menta.fundo,
    borda: pasteis.menta.borda,
    forte: cores.primaria,
    texto: cores.primariaEscura,
  },
  lilas: { fundo: pasteis.lilas.fundo, borda: pasteis.lilas.borda, forte: pasteis.lilas.icone, texto: pasteis.lilas.icone },
  pessego: { fundo: pasteis.pessego.fundo, borda: pasteis.pessego.borda, texto: pasteis.pessego.icone },
  amarelo: { fundo: pasteis.amarelo.fundo, borda: pasteis.amarelo.borda, texto: pasteis.amarelo.icone },
  alerta: {
    forte: cores.alertaForte,
    fundo: cores.alertaFundo,
    borda: cores.alertaBorda,
    texto: cores.alertaTexto,
    escuro: cores.alertaTexto,
  },
};

const t = tamanhosE.familia;
export const tamanhos = { minimo: t.minimo, corpo: t.texto, lista: 17, secao: 18, titulo: t.titulo, tituloAlerta: 32, numeroResumo: 34 };

export const raios = { pilula: 999, cartaoGrande: raiosE.cartao, cartao: raiosE.cartao, cartaoMedio: raiosE.cartao, bloco: 22, pequeno: raiosE.campo };

export const alvos = { familiaMinimo: 48 };

/** Sem sombras: o "cartao" desenha a borda de 1,5 px da Variação E. */
export const sombras = {
  cartao: `0 0 0 ${bordas.cartao}px ${cores.borda}`,
  botaoPrincipal: 'none',
  alerta: `0 0 0 ${bordas.cartao}px ${cores.alertaBorda}`,
};

export const espacos = { margemTela: 21, margemTelaFamilia: 20, entreBlocos: 16, lateral: 21, bloco: 16 };

/** Nomes das fontes carregadas em app/_layout.tsx. `destaque` = títulos (Nunito 800). */
export const fontes = { texto: fontesE.texto, textoNegrito: fontesE.textoNegrito, destaque: fontesE.titulo } as const;

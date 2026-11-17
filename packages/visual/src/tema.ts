// Tema da Variação E, compartilhado pelos dois apps. Fonte da verdade: docs/design.md.
// Só dados (sem React), para os testes rodarem em Node. Ao mudar um valor aqui, mude também docs/design.md.

export const cores = {
  fundo: '#FBF8F3',
  superficie: '#FFFFFF',
  borda: '#DDD5C8',
  bordaCampo: '#A9B3AF',
  texto: '#1C2321',
  textoSuave: '#3E4744',
  primaria: '#0F5E5A',
  primariaEscura: '#0A4441',
  sobrePrimaria: '#FFFFFF',
  alertaFundo: '#FCEBDD',
  alertaBorda: '#E9B48C',
  alertaForte: '#B4470F',
  alertaTexto: '#5A2306',
} as const;

/** Pares pastel para cartões e ícones: fundo, borda e cor do ícone/texto escuro. */
export const pasteis = {
  lilas: { fundo: '#EDE8FB', borda: '#CFC5F0', icone: '#3D2F86' }, // remédios
  menta: { fundo: '#E3F2EC', borda: '#BFDCCD', icone: '#0A4441' }, // consultas, sucesso
  pessego: { fundo: '#FCEBDD', borda: '#F0CBAE', icone: '#7A3A10' }, // Lia, exames
  amarelo: { fundo: '#FBF1D3', borda: '#EAD9A0', icone: '#5E4A0C' }, // família, horários
} as const;
export type Pastel = keyof typeof pasteis;

export type NivelRostinho = 1 | 2 | 3 | 4 | 5 | 6;

/** Os 6 níveis do check-in, do "Muito bem" (verde) ao "Muito mal" (vermelho). */
export const rostinhos: Record<NivelRostinho, { rotulo: string; fundo: string; borda: string; rosto: string }> = {
  1: { rotulo: 'Muito bem', fundo: '#C9EBC0', borda: '#7DBF6E', rosto: '#1A4422' },
  2: { rotulo: 'Bem', fundo: '#E1F0B5', borda: '#A8C565', rosto: '#3A4C12' },
  3: { rotulo: 'Mais ou menos', fundo: '#FCEBA4', borda: '#D9BC4E', rosto: '#5A4508' },
  4: { rotulo: 'Não muito bem', fundo: '#FDD6B2', borda: '#E3A061', rosto: '#6E340C' },
  5: { rotulo: 'Mal', fundo: '#F8C4B8', borda: '#DD8574', rosto: '#702414' },
  6: { rotulo: 'Muito mal', fundo: '#F3AEAE', borda: '#D46868', rosto: '#6E161C' },
};
export const NIVEIS: NivelRostinho[] = [1, 2, 3, 4, 5, 6];

/** Cores da paisagem ilustrada (topo do Início, Check-in, Hora do remédio e Painel). */
export const paisagem = {
  dia: {
    ceuTopo: '#FFF3D4',
    ceuBase: '#FFD9B0',
    astro: '#FFC94D',
    halo: '#FFE7A6',
    morroTras: '#9BD6BC',
    morroFrente: '#4FA98C',
    agua: '#8FCBE0',
    texto: '#1C2321',
    botaoFundo: '#0F5E5A',
    botaoTexto: '#FFFFFF',
  },
  noite: {
    ceuTopo: '#1E2A4A',
    ceuBase: '#3A4778',
    astro: '#F4ECCB',
    halo: '#F4ECCB',
    morroTras: '#2F5D58',
    morroFrente: '#1F4642',
    agua: '#28406A',
    texto: '#FFFFFF',
    botaoFundo: '#FFFFFF',
    botaoTexto: '#0A4441',
  },
} as const;

/** Cores do símbolo de três pétalas. */
export const marca = { petalaPessego: '#E8875A', petalaVerde: '#0F5E5A', petalaLilas: '#7C6BD6' } as const;

/** Nomes das fontes, como carregadas por `fontesVariacaoE` (um arquivo por peso). */
export const fontes = {
  titulo: 'Nunito_800ExtraBold',
  texto: 'AtkinsonHyperlegible_400Regular',
  textoNegrito: 'AtkinsonHyperlegible_700Bold',
} as const;

export type App = 'idoso' | 'familia';

/** Tamanhos de letra (px). Idoso: texto mínimo 17. Família: mínimo 14 em rótulos pequenos. */
export const tamanhos = {
  idoso: { titulo: 32, texto: 19, minimo: 17, rotulo: 18, horario: 60, botao: 22, botaoTomei: 30, campo: 19 },
  familia: { titulo: 27, texto: 16, minimo: 14, rotulo: 16, horario: 40, botao: 18, botaoTomei: 22, campo: 17 },
} as const;

/** Alturas de botões e campos (px). */
export const alturas = {
  botaoIdoso: 64,
  botaoTomei: 90,
  botaoFamilia: 56,
  campo: 54,
  /** Área de toque mínima. */
  toqueIdoso: 56,
  toqueFamilia: 44,
} as const;

export const raios = {
  cartao: 26,
  campo: 27,
  quadradinho: 18,
  rostinho: 34,
  paisagemCabecalho: 32,
  paisagemCartao: 28,
  /** Pílula: use metade da altura. */
  pilula: (altura: number) => altura / 2,
} as const;

export const bordas = {
  cartao: 1.5,
  campo: 1.5,
  destaque: 2.5,
  botaoSecundario: 2,
  rostinho: 2,
} as const;

export const espacos = {
  /** Espaço entre blocos. */
  bloco: 16,
  /** Margem lateral das telas. */
  lateral: 21,
  pequeno: 8,
  medio: 12,
} as const;

export const rostinhoTamanho = 96;
export const tracoIcone = 2.1;

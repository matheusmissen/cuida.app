// Grupo de cuidado (docs/PRD.md, seção 2 e seção 10, tela 7 da família). Lógica pura, testada em Node.
// Papéis: responsável principal ('principal') e acompanhante ('apoio').

export type Papel = 'principal' | 'apoio';

export interface MembroDoGrupo {
  usuario_id: string;
  nome_exibicao: string | null;
  papel: Papel;
  ordem_escala: number;
}

/** Letras e números sem os que confundem (0/O, 1/I), como no banco (criar_convite). */
const ALFABETO = /^[A-HJ-NP-Z2-9]{6}$/;

/** "k7m 4qx", "K7M-4QX" → "K7M4QX". Null se não é um código de convite. */
export function lerCodigoDoConvite(texto: string): string | null {
  const codigo = texto.toUpperCase().replace(/[\s-]/g, '');
  return ALFABETO.test(codigo) ? codigo : null;
}

/** "K7M4QX" → "K7M 4QX" (mais fácil de ler e ditar ao telefone). */
export const codigoParaMostrar = (codigo: string) => `${codigo.slice(0, 3)} ${codigo.slice(3)}`;

export function linkDoConvite(codigo: string, base = 'https://cuida-app-familia.vercel.app'): string {
  return `${base.replace(/\/$/, '')}/convite?codigo=${encodeURIComponent(codigo)}`;
}

/** Mensagem para mandar por WhatsApp ou SMS. */
export function mensagemDoConvite(nomePaciente: string, codigo: string, link: string): string {
  return (
    `Você foi convidado para acompanhar ${nomePaciente} no Cuida. ` +
    `Abra ${link}, crie sua conta (ou entre) e use o código ${codigoParaMostrar(codigo)}. ` +
    'O convite vale por 7 dias.'
  );
}

export const rotuloDoPapel = (papel: Papel) => (papel === 'principal' ? 'Responsável principal' : 'Acompanhante');

export function nomeDoMembro(m: Pick<MembroDoGrupo, 'nome_exibicao' | 'papel'>): string {
  return m.nome_exibicao?.trim() || (m.papel === 'principal' ? 'Responsável principal' : 'Acompanhante sem nome');
}

/** Responsável primeiro, depois pela ordem da escala. */
export function ordenarGrupo<T extends Pick<MembroDoGrupo, 'papel' | 'ordem_escala'>>(grupo: T[]): T[] {
  return [...grupo].sort((a, b) =>
    a.papel === b.papel ? a.ordem_escala - b.ordem_escala : a.papel === 'principal' ? -1 : 1,
  );
}

/** Só o responsável principal muda a rotina de remédios (o banco também garante). */
export const podeMudarRemedios = (papel: Papel | null | undefined) => papel === 'principal';

// "Minha privacidade" no celular do idoso: quem acompanha e tirar alguém do grupo.
export interface MembroParaOIdoso {
  usuario_id: string;
  nome: string;
  papel: 'principal' | 'apoio';
}

export function papelParaOIdoso(papel: 'principal' | 'apoio'): string {
  return papel === 'principal' ? 'Responsável pelos seus remédios' : 'Acompanha você';
}

/** O que a tela pergunta antes de tirar alguém. `podeTirar` é falso quando é a única pessoa do grupo. */
export function confirmacaoTirarDoGrupo(pessoa: MembroParaOIdoso, grupo: MembroParaOIdoso[]): {
  podeTirar: boolean;
  pergunta: string;
  detalhe: string;
} {
  const outros = grupo.filter((p) => p.usuario_id !== pessoa.usuario_id);
  if (outros.length === 0) {
    return {
      podeTirar: false,
      pergunta: `${pessoa.nome} é a única pessoa do grupo.`,
      detalhe: 'Alguém precisa cuidar dos seus remédios. Peça para outra pessoa entrar no grupo antes.',
    };
  }
  const novo = pessoa.papel === 'principal' ? outros.find((p) => p.papel === 'apoio') ?? outros[0] : null;
  return {
    podeTirar: true,
    pergunta: `Tirar ${pessoa.nome} do grupo?`,
    detalhe: novo
      ? `${pessoa.nome} não vai mais ver nada. ${novo.nome} passa a cuidar dos seus remédios.`
      : `${pessoa.nome} não vai mais ver nada nem receber avisos.`,
  };
}

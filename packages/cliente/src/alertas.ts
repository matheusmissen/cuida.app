// Tela do alerta da família (docs/PRD.md, seção 10, tela 6): escalada, resolução e telefone.
// Lógica pura, testada em Node. A escalada segue a mesma conta do servidor
// (supabase/functions/_shared/escala.ts): responsável primeiro; sem ação em `escaladaMin`, todo o grupo.

import { minutosPorExtenso, type Tempos } from '@cuida/regras';
import { horaCurta } from './formato.ts';
import type { AlertaLinha } from './tipos.ts';

export interface PessoaDoGrupo {
  usuario_id: string;
  nome_exibicao: string | null;
  papel: 'principal' | 'apoio';
}

export interface SituacaoEscalada {
  /** Quem já foi avisado, na ordem da escala. */
  avisados: { nome: string; principal: boolean; voce: boolean }[];
  /** Quantas pessoas do grupo ainda não foram avisadas. */
  faltam: number;
  /** Quando o resto do grupo será avisado (laranja não resolvido com gente a avisar). */
  grupoEm: Date | null;
  /** Frase curta sobre a escalada, para a tela. */
  texto: string;
}

function nomeDe(p: PessoaDoGrupo, eu: string): string {
  if (p.usuario_id === eu) return 'Você';
  return p.nome_exibicao?.trim() || (p.papel === 'principal' ? 'Responsável principal' : 'Familiar');
}

/** Desde quando a escalada conta: a criação do alerta ou o último "Reenviar lembrete". */
export function inicioDaEscalada(alerta: Pick<AlertaLinha, 'criado_em' | 'acao_em'>): number {
  const criado = Date.parse(alerta.criado_em);
  const acao = alerta.acao_em ? Date.parse(alerta.acao_em) : NaN;
  return Number.isFinite(acao) && acao > criado ? acao : criado;
}

export function situacaoDaEscalada(
  alerta: AlertaLinha,
  grupo: PessoaDoGrupo[],
  tempos: Tempos,
  eu: string,
): SituacaoEscalada {
  const ordem = [...grupo].sort((a, b) => (a.papel === b.papel ? 0 : a.papel === 'principal' ? -1 : 1));
  const avisadosIds = new Set(alerta.avisados ?? []);
  const avisados = ordem
    .filter((p) => avisadosIds.has(p.usuario_id))
    .map((p) => ({ nome: nomeDe(p, eu), principal: p.papel === 'principal', voce: p.usuario_id === eu }));
  const faltam = ordem.filter((p) => !avisadosIds.has(p.usuario_id)).length;

  if (alerta.nivel === 'vermelho') {
    return { avisados, faltam, grupoEm: null, texto: 'Emergência: todo o grupo foi avisado na hora.' };
  }
  if (alerta.nivel !== 'laranja') {
    return { avisados, faltam, grupoEm: null, texto: 'Fica só no histórico, sem notificação.' };
  }
  if (alerta.visto_em) {
    return { avisados, faltam, grupoEm: null, texto: 'Resolvido: o resto do grupo não precisou ser avisado.' };
  }
  if (grupo.length <= 1) {
    return { avisados, faltam: 0, grupoEm: null, texto: 'Você é a única pessoa do grupo de cuidado.' };
  }
  if (faltam === 0) {
    return { avisados, faltam, grupoEm: null, texto: 'Todo o grupo já foi avisado.' };
  }
  const grupoEm = new Date(inicioDaEscalada(alerta) + tempos.escaladaMin * 60_000);
  return {
    avisados,
    faltam,
    grupoEm,
    texto: `Se ninguém agir até ${horaCurta(grupoEm.toISOString())}, todo o grupo será avisado (${minutosPorExtenso(tempos.escaladaMin)} depois).`,
  };
}

/** Como o alerta foi resolvido, numa frase. Null se ainda está aberto. */
export function textoDaResolucao(alerta: AlertaLinha, nomePaciente: string): string | null {
  if (!alerta.visto_em) return null;
  const hora = horaCurta(alerta.visto_em);
  switch (alerta.resolucao) {
    case 'tomou':
      return `${nomePaciente} confirmou o remédio às ${hora}.`;
    case 'checkin':
      return `${nomePaciente} fez o check-in às ${hora}.`;
    case 'familia':
      return `Alguém da família falou com ${nomePaciente} e marcou que está tudo bem, às ${hora}.`;
    default:
      return `Visto às ${hora}.`;
  }
}

/** Telefone digitado → só dígitos (10 a 13, com DDD; aceita +55). Null se não parece um telefone. */
export function lerTelefone(texto: string): string | null {
  const limpo = texto.replace(/[\s().-]/g, '');
  const mais = limpo.startsWith('+');
  const digitos = limpo.replace(/^\+/, '');
  if (!/^[0-9]{10,13}$/.test(digitos)) return null;
  return (mais ? '+' : '') + digitos;
}

/** Link para ligar: 10 ou 11 dígitos ganham o +55 do Brasil. */
export function linkDeLigacao(telefone: string): string {
  const digitos = telefone.replace(/[^0-9]/g, '');
  if (telefone.startsWith('+')) return `tel:+${digitos}`;
  return digitos.length <= 11 ? `tel:+55${digitos}` : `tel:+${digitos}`;
}

/** (11) 98765-4321 — só para mostrar. */
export function telefoneFormatado(telefone: string): string {
  const d = telefone.replace(/[^0-9]/g, '').replace(/^55(?=\d{10,11}$)/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return telefone;
}

// Check-in com rostinhos (docs/PRD.md, seção 4): o idoso toca em um dos 6 níveis.
// Grava pela Edge Function `registrar-checkin` (com push do "Muito mal"); se ela falhar, chama direto
// a função do banco `registrar_rostinho` (o alerta aparece no painel, sem push). Lógica pura, testável.
import { precisaConversar, type NivelCheckin } from '@cuida/regras';
import { saudacao } from './formato.ts';
import type { CheckinLinha } from './tipos.ts';

type Chamada = () => Promise<{ error: unknown }>;

async function deuCerto(chamada: Chamada): Promise<boolean> {
  try {
    const { error } = await chamada();
    return !error;
  } catch {
    return false;
  }
}

/** true se o check-in ficou gravado por um dos dois caminhos. */
export async function registrarRostinho(chamadas: { funcao: Chamada; banco: Chamada }): Promise<boolean> {
  return (await deuCerto(chamadas.funcao)) || (await deuCerto(chamadas.banco));
}

/** O que a Lia fala quando a tela do check-in aparece. */
export function perguntaDoCheckin(apelido: string, agora: Date): string {
  return `${saudacao(agora)}, ${apelido}! Como você está hoje? Toque no rostinho.`;
}

/**
 * Resposta da Lia depois do toque. Nos níveis 4 a 6 ela entra na conversa (a frase fica no histórico
 * do agente, para ele saber o contexto). Nunca diz que o sintoma "não é nada".
 */
export function respostaAoRostinho(
  nivel: NivelCheckin,
  apelido: string,
  /** O idoso concordou em conversar com a Lia (IA)? Sem isso, ela não entra na conversa. */
  comLia = true,
): { conversar: boolean; fala: string } {
  if (precisaConversar(nivel) && !comLia) {
    const fala =
      nivel === 6
        ? `${apelido}, sinto muito que você está muito mal. Quem cuida de você vai ficar sabendo. Se precisar, aperte "Preciso de ajuda".`
        : `Sinto muito, ${apelido}. Obrigada por me contar. Se precisar, aperte "Preciso de ajuda".`;
    return { conversar: false, fala };
  }
  if (!precisaConversar(nivel)) {
    const fala =
      nivel === 3
        ? `Obrigada por me contar, ${apelido}. Se precisar de alguma coisa, é só me chamar.`
        : `Que bom, ${apelido}! Obrigada por me contar.`;
    return { conversar: false, fala };
  }
  const fala =
    nivel === 6
      ? `${apelido}, sinto muito que você está muito mal. Sua família vai ficar sabendo. Me conta: o que você está sentindo?`
      : nivel === 5
        ? `Puxa, ${apelido}, sinto muito que você está mal. Me conta: o que você está sentindo?`
        : `Sinto muito que você não está muito bem, ${apelido}. Me conta: o que você está sentindo?`;
  return { conversar: true, fala };
}

/**
 * Check-in do painel da família: o registro mais recente, com o rostinho do mesmo dia.
 * A conversa com a Lia (níveis 4 a 6) grava um segundo registro, sem nível, logo depois do rostinho.
 * `linhas` vem do mais recente para o mais antigo.
 */
export function checkinDoPainel(linhas: CheckinLinha[], fuso = 'America/Sao_Paulo'): CheckinLinha | null {
  const [ultimo] = linhas;
  if (!ultimo) return null;
  if (ultimo.nivel) return ultimo;
  const dia = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: fuso }).format(new Date(iso));
  const comNivel = linhas.find((l) => l.nivel && dia(l.feito_em) === dia(ultimo.feito_em));
  return comNivel ? { ...ultimo, nivel: comNivel.nivel } : ultimo;
}

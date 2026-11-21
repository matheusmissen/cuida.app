// Limite diário de uso da IA (migration 20261130250000_limite_ia.sql, função contar_uso_ia).
// Protege o crédito da API: sem limite, qualquer conta criada poderia gastar de propósito.
// Passou do limite, a IA não é chamada, mas o cuidado continua: a rede de segurança da fala,
// os alarmes, o check-in e o "Preciso de ajuda" não dependem dela.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export type TipoUsoIa = 'conversa' | 'leitura';

/** Mensagens para a Lia por celular de idoso, por dia (cada mensagem pode levar até 4 chamadas à IA). */
export const LIMITE_CONVERSAS_DIA = 60;
/** Receitas e pedidos médicos lidos por conta da família, por dia. */
export const LIMITE_LEITURAS_DIA = 10;

export const LIMITE_DO_TIPO: Record<TipoUsoIa, number> = { conversa: LIMITE_CONVERSAS_DIA, leitura: LIMITE_LEITURAS_DIA };

/** O que a Lia diz quando passa do limite: carinhosa, sem culpa, e lembrando do botão de ajuda. */
export function respostaDoLimite(apelido: string): string {
  return `${apelido}, hoje já conversamos bastante. Amanhã eu continuo com você. Se precisar de alguém agora, aperte "Preciso de ajuda".`;
}

export const ERRO_LIMITE_LEITURA = 'limite de leituras de hoje atingido; tente amanhã ou cadastre à mão';

/**
 * Conta um uso e diz se pode chamar a IA. Se o banco falhar ao contar, deixa usar (melhor gastar
 * um pouco a mais do que deixar o idoso sem resposta por um erro de contagem).
 */
export async function podeUsarIa(db: SupabaseClient, usuarioId: string, tipo: TipoUsoIa): Promise<boolean> {
  const { data, error } = await db.rpc('contar_uso_ia', { p_usuario: usuarioId, p_tipo: tipo, p_limite: LIMITE_DO_TIPO[tipo] });
  if (error) {
    console.error('limite de IA: não consegui contar', error.message);
    return true;
  }
  return data !== false;
}

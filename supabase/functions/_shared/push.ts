// Mensagens de push para a família (Expo Push API). Sem chaves: o Expo aceita
// envios sem token de acesso, a não ser que o projeto exija "enhanced security".

import type { Alerta } from '../../../packages/regras/src/index.ts';
import type { Cuidador } from './escala.ts';

export interface MensagemPush {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  priority: 'high' | 'default';
  channelId: string;
  data: Record<string, string>;
}

const EMOJI = { vermelho: '🔴', laranja: '🟠', amarelo: '🟡', informativo: 'ℹ️' } as const;

export function mensagensPush(
  alerta: Alerta,
  alertaId: string,
  nomePaciente: string,
  destinatarios: Cuidador[],
): MensagemPush[] {
  return destinatarios
    .filter((c): c is Cuidador & { pushToken: string } => Boolean(c.pushToken))
    .map((c) => ({
      to: c.pushToken,
      title: `${EMOJI[alerta.nivel]} ${nomePaciente}`,
      body: alerta.motivo,
      sound: 'default',
      priority: alerta.nivel === 'vermelho' || alerta.nivel === 'laranja' ? 'high' : 'default',
      channelId: 'alertas',
      data: { alertaId, nivel: alerta.nivel },
    }));
}

/** Envia em lotes de 100 (limite do Expo). Erros de push não podem derrubar o alerta. */
export async function enviarPush(mensagens: MensagemPush[], fetchFn: typeof fetch = fetch): Promise<number> {
  let enviadas = 0;
  for (let i = 0; i < mensagens.length; i += 100) {
    const lote = mensagens.slice(i, i + 100);
    try {
      const resp = await fetchFn('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(lote),
      });
      if (resp.ok) enviadas += lote.length;
      else console.error('push: resposta', resp.status);
    } catch (erro) {
      console.error('push: falha de rede', erro instanceof Error ? erro.message : erro);
    }
  }
  return enviadas;
}

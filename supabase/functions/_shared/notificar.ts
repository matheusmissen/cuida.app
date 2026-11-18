// Manda web push para os navegadores inscritos de um grupo de usuários e limpa as inscrições expiradas.
// Sem as chaves VAPID nos segredos, não faz nada (o alerta continua no painel em tempo real).

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { enviarWebPush, type ChavesVapid, type Inscricao, type Notificacao } from './webpush.ts';

/** Chaves dos segredos VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e VAPID_SUBJECT (opcional). */
export function chavesVapid(env: (nome: string) => string | undefined): ChavesVapid | null {
  const publica = env('VAPID_PUBLIC_KEY');
  const privada = env('VAPID_PRIVATE_KEY');
  if (!publica || !privada) return null;
  return { publica, privada, assunto: env('VAPID_SUBJECT') || 'https://cuida-app-familia.vercel.app' };
}

let avisouSemChaves = false;

/** @returns quantas notificações foram entregues ao serviço de push */
export async function notificarUsuarios(
  supabase: SupabaseClient,
  usuarioIds: string[],
  app: 'idoso' | 'familia',
  notificacao: Notificacao,
  chaves: ChavesVapid | null = chavesVapid((n) => Deno.env.get(n)),
): Promise<number> {
  if (usuarioIds.length === 0) return 0;
  if (!chaves) {
    if (!avisouSemChaves) console.warn('web push: VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY não configuradas');
    avisouSemChaves = true;
    return 0;
  }
  const { data, error } = await supabase
    .from('inscricoes_push')
    .select('endpoint, p256dh, auth')
    .in('usuario_id', usuarioIds)
    .eq('app', app);
  if (error) {
    console.error('web push: inscrições', error.message);
    return 0;
  }
  const inscricoes = (data ?? []) as Inscricao[];
  const resultados = await Promise.all(inscricoes.map((i) => enviarWebPush(i, notificacao, chaves)));
  const expiradas = inscricoes.filter((_, n) => resultados[n] === 'expirada').map((i) => i.endpoint);
  if (expiradas.length > 0) await supabase.from('inscricoes_push').delete().in('endpoint', expiradas);
  return resultados.filter((r) => r === 'enviada').length;
}

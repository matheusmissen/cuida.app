// Edge Function `pedir-ajuda`: botão "Preciso de ajuda" do app do idoso.
//
// Entrada: POST (sem corpo) com o token do aparelho do idoso.
// Saída:   { alerta_id, novo }
//
// O alerta é gravado pela função do banco `pedir_ajuda()` (com o token do aparelho), a mesma que o app
// chama direto se esta função falhar. Aqui só se acrescenta o push para todo o círculo de cuidado.
// Não usa IA: o pedido de ajuda funciona mesmo com o LLM fora do ar.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { pedidoDeAjuda } from '../../../packages/regras/src/index.ts';
import { carregarCuidadores, nomeDoPaciente } from '../_shared/alertar.ts';
import { destinatariosIniciais } from '../_shared/escala.ts';
import { enviarPush, mensagensPush } from '../_shared/push.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ erro: 'use POST' }, 405);

  const autorizacao = req.headers.get('Authorization') ?? '';
  const url = Deno.env.get('SUPABASE_URL')!;

  // Com o token do aparelho: a função do banco descobre a paciente pelo usuário do aparelho.
  const comoIdoso = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: autorizacao } },
  });
  const { data, error } = await comoIdoso.rpc('pedir_ajuda');
  if (error) {
    const naoVinculado = /não vinculado/i.test(error.message);
    return json({ erro: error.message }, naoVinculado ? 403 : 500);
  }
  const resultado = data as { alerta_id: string; novo: boolean };

  // Push só no primeiro toque; toques repetidos em 2 minutos reaproveitam o mesmo alerta.
  if (resultado.novo) {
    try {
      const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
      const { data: paciente } = await db
        .from('alertas')
        .select('paciente_id')
        .eq('id', resultado.alerta_id)
        .single();
      if (paciente) {
        const alerta = pedidoDeAjuda();
        const cuidadores = await carregarCuidadores(db, paciente.paciente_id);
        const destinatarios = destinatariosIniciais(alerta.nivel, cuidadores);
        const nome = await nomeDoPaciente(db, paciente.paciente_id);
        await enviarPush(mensagensPush(alerta, resultado.alerta_id, nome, destinatarios));
      }
    } catch (erro) {
      // O alerta já está gravado e aparece no painel em tempo real; falha de push não desfaz isso.
      console.error('pedir-ajuda: push', erro instanceof Error ? erro.message : erro);
    }
  }

  return json(resultado);
});

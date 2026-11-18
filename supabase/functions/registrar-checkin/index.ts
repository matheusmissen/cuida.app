// Edge Function `registrar-checkin`: rostinho escolhido no check-in diário do app do idoso.
//
// Entrada: POST { nivel: 1..6 } com o token do aparelho do idoso.
// Saída:   { checkin_id, alerta_id, novo_alerta }
//
// O check-in (e o alerta laranja do "Muito mal") é gravado pela função do banco `registrar_rostinho`
// com o token do aparelho, a mesma que o app chama direto se esta função falhar. Aqui só se acrescenta
// o push para o responsável. Não usa IA.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { avaliarRostinho } from '../../../packages/regras/src/index.ts';
import { avisarFamilia, carregarCuidadores, nomeDoPaciente } from '../_shared/alertar.ts';
import { destinatariosIniciais } from '../_shared/escala.ts';

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

  let nivel: number;
  try {
    nivel = Number((await req.json())?.nivel);
  } catch {
    return json({ erro: 'corpo inválido' }, 400);
  }
  if (!Number.isInteger(nivel) || nivel < 1 || nivel > 6) return json({ erro: 'nível de 1 a 6' }, 400);

  const autorizacao = req.headers.get('Authorization') ?? '';
  const url = Deno.env.get('SUPABASE_URL')!;
  const comoIdoso = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: autorizacao } },
  });
  const { data, error } = await comoIdoso.rpc('registrar_rostinho', { p_nivel: nivel });
  if (error) {
    const naoVinculado = /não vinculado/i.test(error.message);
    return json({ erro: error.message }, naoVinculado ? 403 : 500);
  }
  const resultado = data as { checkin_id: string; alerta_id: string | null; novo_alerta: boolean };

  const alerta = avaliarRostinho(nivel as 1 | 2 | 3 | 4 | 5 | 6);
  if (resultado.novo_alerta && resultado.alerta_id && alerta) {
    try {
      const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
      const { data: linha } = await db.from('alertas').select('paciente_id').eq('id', resultado.alerta_id).single();
      if (linha) {
        const cuidadores = await carregarCuidadores(db, linha.paciente_id);
        const nome = await nomeDoPaciente(db, linha.paciente_id);
        await avisarFamilia(db, alerta, resultado.alerta_id, nome, destinatariosIniciais(alerta.nivel, cuidadores));
      }
    } catch (erro) {
      // O alerta já está gravado e aparece no painel em tempo real; falha de push não desfaz isso.
      console.error('registrar-checkin: push', erro instanceof Error ? erro.message : erro);
    }
  }

  return json(resultado);
});

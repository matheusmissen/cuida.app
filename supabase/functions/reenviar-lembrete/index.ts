// Edge Function `reenviar-lembrete`: botão "Reenviar lembrete" da tela do alerta (app da família).
//
// Entrada: POST { alerta_id } com o token do cuidador.
// Saída:   { enviadas, resolvido? }
//   enviadas = quantos celulares do idoso receberam (0 = o celular não ativou os avisos).
//   resolvido = o alerta já estava resolvido (por exemplo, ela já tomou): nada é enviado.
//
// Quem pode: só cuidador da paciente (o alerta é lido com o token de quem chamou, pela RLS).
// Também conta como ação do responsável: a escalada recomeça a contar (alertas.acao_em).

import { createClient } from 'npm:@supabase/supabase-js@2';
import { notificacaoDeReenvio } from '../_shared/lembretes.ts';
import { notificarUsuarios } from '../_shared/notificar.ts';

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

  const corpo = (await req.json().catch(() => null)) as { alerta_id?: string } | null;
  const alertaId = corpo?.alerta_id;
  if (!alertaId || !/^[0-9a-f-]{36}$/i.test(alertaId)) return json({ erro: 'alerta_id inválido' }, 400);

  const url = Deno.env.get('SUPABASE_URL')!;
  // Com o token do cuidador: a RLS só mostra alertas de pacientes de quem chamou.
  const comoCuidador = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: alerta } = await comoCuidador
    .from('alertas')
    .select('id, paciente_id, gatilho, dose_id, visto_em')
    .eq('id', alertaId)
    .maybeSingle();
  if (!alerta) return json({ erro: 'alerta não encontrado' }, 404);
  if (alerta.visto_em) return json({ enviadas: 0, resolvido: true });

  // Servidor (service role): aparelho do idoso, dose e envio.
  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: paciente } = await db
    .from('pacientes')
    .select('usuario_id, nome, apelido')
    .eq('id', alerta.paciente_id)
    .single();
  if (!paciente?.usuario_id) return json({ erro: 'celular do idoso não vinculado' }, 409);

  let dose: { id: string; nomeRemedio: string; dose: string | null } | null = null;
  if (alerta.dose_id) {
    const { data } = await db
      .from('doses')
      .select('id, confirmado_em, horarios!inner(remedios!inner(nome, dose))')
      .eq('id', alerta.dose_id)
      .maybeSingle();
    // deno-lint-ignore no-explicit-any
    const linha = data as any;
    if (linha?.confirmado_em) return json({ enviadas: 0, resolvido: true });
    if (linha) dose = { id: linha.id, nomeRemedio: linha.horarios.remedios.nome, dose: linha.horarios.remedios.dose };
  }

  const apelido = paciente.apelido || String(paciente.nome).split(' ')[0];
  const enviadas = await notificarUsuarios(
    db,
    [paciente.usuario_id],
    'idoso',
    notificacaoDeReenvio(alerta.gatilho, apelido, new Date(), dose),
  );
  // Ação do responsável: mais `escalada_min` antes de avisar o grupo.
  await db.from('alertas').update({ acao_em: new Date().toISOString() }).eq('id', alerta.id).is('visto_em', null);

  return json({ enviadas });
});

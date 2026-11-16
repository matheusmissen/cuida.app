// Utilidades de servidor (Deno) compartilhadas pelas Edge Functions.
// SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY são injetadas pelo Supabase.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { Alerta } from './regras/index.ts';
import { novosDestinatarios, type CuidadorEscala } from './logica/escala.ts';
import { montarMensagens, type MensagemPush } from './logica/push.ts';

export type Db = SupabaseClient;

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

export function clienteServico(): Db {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
}

/** Usuário dono do token do app (ou null). */
export async function usuarioDaRequisicao(req: Request): Promise<string | null> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false },
  });
  const { data, error } = await anon.auth.getUser(token);
  return error ? null : data.user?.id ?? null;
}

export async function enviarPush(mensagens: MensagemPush[]): Promise<void> {
  for (let i = 0; i < mensagens.length; i += 100) {
    const lote = mensagens.slice(i, i + 100);
    const r = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(lote),
    });
    if (!r.ok) console.error('Falha no push da Expo', r.status, await r.text());
  }
}

/** Já existe alerta com este gatilho nas últimas `horas`? Evita repetir o mesmo aviso. */
export async function alertaRecente(db: Db, pacienteId: string, gatilho: string, horas: number): Promise<boolean> {
  const desde = new Date(Date.now() - horas * 3_600_000).toISOString();
  const { count } = await db
    .from('alertas')
    .select('id', { count: 'exact', head: true })
    .eq('paciente_id', pacienteId)
    .eq('gatilho', gatilho)
    .gte('criado_em', desde);
  return (count ?? 0) > 0;
}

/** Avisa quem ainda não foi avisado e registra em `alertas.avisados`. */
export async function notificarAlerta(
  db: Db,
  alerta: { id: string; paciente_id: string; nivel: Alerta['nivel']; motivo: string; criado_em: string; avisados: string[]; visto_em: string | null },
): Promise<number> {
  const [{ data: cuidadores }, { data: paciente }] = await Promise.all([
    db.from('cuidadores').select('usuario_id, ordem_escala, expo_push_token').eq('paciente_id', alerta.paciente_id),
    db.from('pacientes').select('apelido, nome').eq('id', alerta.paciente_id).single(),
  ]);
  const minutos = (Date.now() - Date.parse(alerta.criado_em)) / 60_000;
  const novos = novosDestinatarios(
    alerta.nivel,
    (cuidadores ?? []) as CuidadorEscala[],
    minutos,
    alerta.avisados,
    alerta.visto_em !== null,
  );
  if (novos.length === 0) return 0;
  const tokens = novos.map((c) => c.expo_push_token).filter((t): t is string => Boolean(t));
  await enviarPush(montarMensagens(tokens, alerta, paciente?.apelido ?? paciente?.nome ?? 'Paciente'));
  await db
    .from('alertas')
    .update({ avisados: [...alerta.avisados, ...novos.map((c) => c.usuario_id)] })
    .eq('id', alerta.id);
  return novos.length;
}

/** Cria o alerta e avisa a família conforme o nível. */
export async function criarAlerta(db: Db, pacienteId: string, alerta: Alerta): Promise<void> {
  const { data, error } = await db
    .from('alertas')
    .insert({ paciente_id: pacienteId, gatilho: alerta.gatilho, nivel: alerta.nivel, motivo: alerta.motivo })
    .select('id, paciente_id, nivel, motivo, criado_em, avisados, visto_em')
    .single();
  if (error || !data) {
    console.error('Falha ao criar alerta', error);
    return;
  }
  await notificarAlerta(db, data);
}

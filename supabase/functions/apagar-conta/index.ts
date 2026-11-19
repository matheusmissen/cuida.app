// Edge Function `apagar-conta`: "Apagar minha conta" do familiar (LGPD; termos do familiar).
// 1. Confere quem está logado (token do familiar) e a confirmação { confirmacao: 'APAGAR' }.
// 2. apagar_conta (banco, só o servidor): tira a pessoa dos grupos, passa a responsabilidade e apaga
//    os pacientes em que ela era a única do grupo.
// 3. Remove os arquivos desses pacientes (buckets documentos e remedios, pasta <paciente_id>/).
// 4. Apaga o usuário do Auth (e-mail, inscrições de avisos e termos aceitos vão junto).
// Se algo falhar no meio, dá para tentar de novo: cada passo pode ser repetido.

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const BUCKETS = ['documentos', 'remedios'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ erro: 'use POST' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false } });
  const { data: usuario } = await anon.auth.getUser(token);
  const conta = usuario?.user;
  if (!conta) return json({ erro: 'não autorizado' }, 401);
  const uid = conta.id;
  // O celular do idoso entra sem e-mail (login anônimo): esta função é só para contas da família.
  if (conta.is_anonymous || !conta.email) return json({ erro: 'só contas da família podem ser apagadas aqui' }, 403);

  const corpo = (await req.json().catch(() => null)) as { confirmacao?: string } | null;
  if (corpo?.confirmacao !== 'APAGAR') return json({ erro: 'confirmação ausente' }, 400);

  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  try {
    const { data: apagados, error } = await db.rpc('apagar_conta', { p_usuario: uid });
    if (error) throw new Error(`apagar_conta: ${error.message}`);
    const pacientes = ((apagados ?? []) as unknown[]).map(String);

    for (const paciente of pacientes) {
      for (const bucket of BUCKETS) {
        const { data: arquivos } = await db.storage.from(bucket).list(paciente, { limit: 1000 });
        const caminhos = (arquivos ?? []).map((a) => `${paciente}/${a.name}`);
        if (caminhos.length > 0) {
          const { error: erroArquivos } = await db.storage.from(bucket).remove(caminhos);
          if (erroArquivos) console.error('apagar-conta: arquivos', bucket, erroArquivos.message);
        }
      }
    }

    const { error: erroUsuario } = await db.auth.admin.deleteUser(uid);
    if (erroUsuario) throw new Error(`auth: ${erroUsuario.message}`);
    return json({ apagada: true, pacientes_apagados: pacientes.length });
  } catch (erro) {
    console.error('apagar-conta', erro instanceof Error ? erro.message : erro);
    return json({ erro: 'não foi possível apagar a conta agora; tente de novo' }, 500);
  }
});

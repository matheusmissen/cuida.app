// Edge Function `ler-receita`: lê a foto (ou PDF) de uma receita ou de um pedido médico com a API da
// Anthropic e grava SUGESTÕES em documentos.leitura, com status aguardando_conferencia.
// - Receita: remédios e horários (_shared/receita.ts). Nunca cria alarmes: a família confere e chama
//   criar_alarmes_da_receita.
// - Pedido médico, guia ou cartão de retorno: data, médico, especialidade, local e preparo
//   (_shared/pedido.ts). Nunca cria consulta: a família confere e chama conferir_pedido.
//
// Entrada: POST { documento_id } com o token de um cuidador do paciente.
// Saída:   receita { status, itens, alarmes }; pedido { status, pedido }; ou { erro }.
// Limite: LIMITE_LEITURAS_DIA leituras por conta por dia (_shared/limites.ts, contar_uso_ia).
// Segredos: LLM_API_KEY. Opcional: LLM_MODEL_VISAO (padrão claude-sonnet-5-5, melhor para letra de médico).

import { createClient } from 'npm:@supabase/supabase-js@2';
import { contarAlarmes, FERRAMENTA_LEITURA, INSTRUCOES_LEITURA, normalizarLeitura } from '../_shared/receita.ts';
import { FERRAMENTA_PEDIDO, hojeEmBrasilia, INSTRUCOES_PEDIDO, normalizarPedido } from '../_shared/pedido.ts';
import { ERRO_LIMITE_LEITURA, podeUsarIa } from '../_shared/limites.ts';

const MODELO = Deno.env.get('LLM_MODEL_VISAO') ?? 'claude-sonnet-5-5';
const TAMANHO_MAXIMO = 5 * 1024 * 1024; // limite de imagem da API
const IMAGENS = ['image/jpeg', 'image/png', 'image/webp'];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

function paraBase64(bytes: Uint8Array): string {
  let binario = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binario);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ erro: 'use POST' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const autorizacao = req.headers.get('Authorization') ?? '';
  // Cliente com o token do cuidador: o RLS garante que ele só lê documentos do seu paciente.
  const comoFamilia = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: autorizacao } },
  });
  const { data: usuario } = await comoFamilia.auth.getUser(autorizacao.replace(/^Bearer\s+/i, ''));
  if (!usuario?.user) return json({ erro: 'não autorizado' }, 401);

  const corpo = (await req.json().catch(() => null)) as { documento_id?: string } | null;
  if (!corpo?.documento_id) return json({ erro: 'documento_id é obrigatório' }, 400);

  const { data: doc } = await comoFamilia
    .from('documentos')
    .select('id, tipo, status, arquivo_path, mime')
    .eq('id', corpo.documento_id)
    .single();
  if (!doc) return json({ erro: 'documento não encontrado' }, 404);
  if (doc.tipo !== 'receita' && doc.tipo !== 'pedido') return json({ erro: 'só receitas e pedidos médicos são lidos' }, 400);
  const ehPedido = doc.tipo === 'pedido';
  if (doc.status === 'conferida') return json({ erro: ehPedido ? 'pedido já conferido' : 'receita já conferida' }, 409);
  const ferramenta = ehPedido ? FERRAMENTA_PEDIDO : FERRAMENTA_LEITURA;

  // Servidor (service role): baixa o arquivo e grava a leitura, que o app não pode alterar.
  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const marcar = (status: string, leitura?: unknown) =>
    db.from('documentos').update(leitura === undefined ? { status } : { status, leitura }).eq('id', doc.id);

  // Limite diário de leituras por conta (_shared/limites.ts). A família ainda pode cadastrar à mão.
  if (!(await podeUsarIa(db, usuario.user.id, 'leitura'))) {
    await marcar('erro');
    return json({ erro: ERRO_LIMITE_LEITURA }, 429);
  }

  await marcar('lendo');
  try {
    const { data: arquivo, error: erroArquivo } = await db.storage.from('documentos').download(doc.arquivo_path);
    if (erroArquivo || !arquivo) throw new Error(`arquivo: ${erroArquivo?.message ?? 'não encontrado'}`);
    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    if (bytes.length > TAMANHO_MAXIMO) {
      await marcar('erro');
      return json({ erro: 'arquivo maior que 5 MB; tire a foto de novo com menos zoom' }, 413);
    }

    const tipo = doc.mime ?? arquivo.type;
    const anexo = tipo === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: paraBase64(bytes) } }
      : IMAGENS.includes(tipo)
      ? { type: 'image', source: { type: 'base64', media_type: tipo, data: paraBase64(bytes) } }
      : null;
    if (!anexo) {
      await marcar('erro');
      return json({ erro: 'formato não suportado; envie JPG, PNG, WEBP ou PDF' }, 415);
    }

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': Deno.env.get('LLM_API_KEY')!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 2000,
        system: ehPedido ? INSTRUCOES_PEDIDO : INSTRUCOES_LEITURA,
        tools: [ferramenta],
        tool_choice: { type: 'tool', name: ferramenta.name },
        messages: [
          {
            role: 'user',
            content: [
              anexo,
              { type: 'text', text: ehPedido ? 'Transcreva este pedido médico.' : 'Transcreva os remédios desta receita.' },
            ],
          },
        ],
      }),
    });
    if (!r.ok) throw new Error(`LLM ${r.status}: ${await r.text()}`);
    const msg = await r.json();
    // deno-lint-ignore no-explicit-any
    const uso = (msg.content as any[]).find((b) => b.type === 'tool_use' && b.name === ferramenta.name);

    if (ehPedido) {
      const pedido = normalizarPedido(uso?.input, hojeEmBrasilia(new Date()));
      await marcar('aguardando_conferencia', { pedido, lido_em: new Date().toISOString(), modelo: MODELO });
      return json({ status: 'aguardando_conferencia', pedido });
    }
    const leitura = normalizarLeitura(uso?.input);
    const resultado = { ...leitura, lido_em: new Date().toISOString(), modelo: MODELO };
    await marcar('aguardando_conferencia', resultado);
    return json({ status: 'aguardando_conferencia', itens: leitura.itens, alarmes: contarAlarmes(leitura.itens) });
  } catch (erro) {
    console.error('ler-receita', erro instanceof Error ? erro.message : erro);
    await marcar('erro');
    return json({ erro: ehPedido ? 'não foi possível ler o pedido agora; tente de novo ou marque a consulta à mão' : 'não foi possível ler a receita agora; tente de novo ou cadastre à mão' }, 502);
  }
});

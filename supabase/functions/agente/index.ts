// Edge Function `agente`: a conversa com a Lia.
// O app do idoso transcreve a fala no próprio aparelho e envia o texto; a resposta volta em texto
// e o app a fala com expo-speech. Assim o MVP não depende de serviço pago de voz.
//
// Entrada: POST { texto, historico?: [{ papel: 'idoso' | 'lia', texto }] } com o token do aparelho do idoso.
// Saída:   { resposta, alertas: [{ nivel, motivo }] }
//
// Segurança em camadas:
// 1. O LLM extrai sintomas e chama as ferramentas.
// 2. A rede de palavras-chave (sinais.ts) é mesclada ao que o LLM extraiu; o mais grave vence.
// 3. Se o LLM não registrar o check-in mas houver sinal de alerta, o servidor registra sozinho.
// 4. Se o LLM falhar, a rede de segurança ainda registra e alerta.
// 5. A resposta passa por revisao.ts antes de ser falada.
// Os alertas são decididos por avaliarCheckin (packages/regras) e gravados por criarEAvisar.
//
// Segredos: LLM_API_KEY (Anthropic). Opcionais: LLM_MODEL, NOME_ASSISTENTE.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { avaliarCheckin, avaliarNaoEntendeu, pedidoDeAjuda, type Alerta, type Checkin } from '../../../packages/regras/src/index.ts';
import { criarEAvisar } from '../_shared/alertar.ts';
import { contarNaoEntendeu } from './entendimento.ts';
import { FERRAMENTAS } from './ferramentas.ts';
import { deLinha, paraLinha, type LinhaCheckin } from './mapeamento.ts';
import { montarPromptSistema } from './prompt.ts';
import { revisarResposta } from './revisao.ts';
import { detectarSinais, mesclarSinais, temSinalDeAlerta } from './sinais.ts';

interface Fala {
  papel: 'idoso' | 'lia';
  texto: string;
}

const MODELO = Deno.env.get('LLM_MODEL') ?? 'claude-haiku-5-5';
const NOME_ASSISTENTE = Deno.env.get('NOME_ASSISTENTE') ?? 'Lia';
const FALHA_IA = 'Desculpe, não consegui entender agora. A senhora pode repetir?';
const HORA = 3_600_000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const fmtHora = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

interface DoseHoje {
  id: string;
  previsto_em: string;
  status: string;
  horarios: { remedios: { nome: string; dose: string } | null } | null;
}

async function dosesDeHoje(db: SupabaseClient, pacienteId: string): Promise<DoseHoje[]> {
  const { data } = await db
    .from('doses')
    .select('id, previsto_em, status, horarios(remedios(nome, dose))')
    .eq('paciente_id', pacienteId)
    .gte('previsto_em', new Date(Date.now() - 12 * HORA).toISOString())
    .lte('previsto_em', new Date(Date.now() + 14 * HORA).toISOString())
    .order('previsto_em');
  return (data ?? []) as unknown as DoseHoje[];
}

async function registrarCheckin(
  db: SupabaseClient,
  pacienteId: string,
  config: { condicoes: string[]; limiteFebre: number },
  dados: Partial<Checkin>,
  extra: { sono?: string; notas?: string },
): Promise<Alerta[]> {
  const atual: Checkin = { ...dados, feitoEm: new Date().toISOString() };
  const { data: anteriores } = await db
    .from('checkins')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('feito_em', { ascending: false })
    .limit(10);
  const { error } = await db.from('checkins').insert(paraLinha(atual, pacienteId, extra));
  if (error) console.error('checkin', error.message);
  const alertas = avaliarCheckin(atual, ((anteriores ?? []) as LinhaCheckin[]).map(deLinha), config);
  for (const a of alertas) {
    try {
      await criarEAvisar(db, pacienteId, a);
    } catch (erro) {
      console.error('alerta', erro instanceof Error ? erro.message : erro);
    }
  }
  return alertas;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ erro: 'use POST' }, 405);

  const autorizacao = req.headers.get('Authorization') ?? '';
  const url = Deno.env.get('SUPABASE_URL')!;
  // Cliente com o token do aparelho: respeita RLS e as funções do banco (confirmar_dose etc.).
  const comoIdoso = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: autorizacao } },
  });
  const { data: usuario } = await comoIdoso.auth.getUser(autorizacao.replace(/^Bearer\s+/i, ''));
  if (!usuario?.user) return json({ erro: 'não autorizado' }, 401);

  const corpo = (await req.json().catch(() => null)) as { texto?: string; historico?: Fala[] } | null;
  const texto = corpo?.texto?.trim();
  if (!texto) return json({ erro: 'texto vazio' }, 400);
  const historico = (corpo?.historico ?? []).slice(-12);

  // Servidor (service role): grava check-ins e alertas.
  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: paciente } = await db
    .from('pacientes')
    .select('id, nome, apelido, condicoes, limite_febre')
    .eq('usuario_id', usuario.user.id)
    .single();
  if (!paciente) return json({ erro: 'aparelho não vinculado' }, 403);
  await comoIdoso.rpc('registrar_interacao');

  const config = { condicoes: (paciente.condicoes ?? []) as string[], limiteFebre: Number(paciente.limite_febre ?? 37.8) };
  const apelido = paciente.apelido ?? paciente.nome;
  const falasDoIdoso = [...historico.filter((f) => f.papel === 'idoso').map((f) => f.texto), texto].join(' . ');
  const sinais = detectarSinais(texto);

  const alertasGerados: Alerta[] = [];
  let checkinRegistrado = false;
  let resposta = '';

  try {
    const [{ data: memoria }, doses] = await Promise.all([
      db.from('memoria_paciente').select('chave, valor').eq('paciente_id', paciente.id),
      dosesDeHoje(db, paciente.id),
    ]);
    const system = montarPromptSistema({
      nomeAssistente: NOME_ASSISTENTE,
      apelido,
      condicoes: config.condicoes,
      memoria: memoria ?? [],
      agoraLocal: new Date().toLocaleString('pt-BR', {
        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
      }),
      compromissosHoje: doses.map(
        (d) => `${fmtHora(d.previsto_em)}: ${d.horarios?.remedios?.nome} (${d.status === 'tomado' ? 'já tomou' : 'falta tomar'})`,
      ),
    });

    // deno-lint-ignore no-explicit-any
    const messages: any[] = [
      ...historico.map((f) => ({ role: f.papel === 'idoso' ? 'user' : 'assistant', content: f.texto })),
      { role: 'user', content: texto },
    ];

    for (let rodada = 0; rodada < 4; rodada++) {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': Deno.env.get('LLM_API_KEY')!,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ model: MODELO, max_tokens: 300, system, tools: FERRAMENTAS, messages }),
      });
      if (!r.ok) throw new Error(`LLM ${r.status}: ${await r.text()}`);
      const msg = await r.json();
      messages.push({ role: 'assistant', content: msg.content });
      // deno-lint-ignore no-explicit-any
      const blocos = msg.content as any[];
      resposta = blocos.filter((b) => b.type === 'text').map((b) => b.text).join(' ').trim();

      const usos = blocos.filter((b) => b.type === 'tool_use');
      if (usos.length === 0) break;

      const resultados = [];
      for (const uso of usos) {
        let saida = 'ok';
        if (uso.name === 'registrar_checkin') {
          const { feitoEm: _f, ...doLlm } = deLinha({ ...uso.input, paciente_id: paciente.id, feito_em: new Date().toISOString() });
          const dados = mesclarSinais(doLlm, detectarSinais(falasDoIdoso));
          const novos = await registrarCheckin(db, paciente.id, config, dados, { sono: uso.input.sono, notas: uso.input.notas });
          alertasGerados.push(...novos);
          checkinRegistrado = true;
          saida = novos.some((a) => a.nivel === 'vermelho' || a.nivel === 'laranja')
            ? 'Registrado. A família foi avisada. Diga isso com calma e oriente procurar o médico.'
            : 'Registrado.';
        } else if (uso.name === 'confirmar_remedio') {
          const nome = String(uso.input.remedio ?? '').toLowerCase();
          const pendente = doses
            .filter((d) => d.status === 'pendente' && Date.parse(d.previsto_em) <= Date.now() + 2 * HORA)
            .sort((a, b) => {
              const casaA = a.horarios?.remedios?.nome?.toLowerCase().includes(nome) ? 0 : 1;
              const casaB = b.horarios?.remedios?.nome?.toLowerCase().includes(nome) ? 0 : 1;
              return casaA - casaB || Date.parse(a.previsto_em) - Date.parse(b.previsto_em);
            })[0];
          if (pendente) {
            // Mesma função do botão "Tomei": baixa o estoque e conta como interação.
            const { error } = await comoIdoso.rpc('confirmar_dose', { p_dose: pendente.id });
            if (error) {
              saida = 'Não consegui registrar agora. Peça para tocar em "Tomei" na tela.';
            } else {
              pendente.status = 'tomado';
              saida = `Confirmado: ${pendente.horarios?.remedios?.nome} das ${fmtHora(pendente.previsto_em)}.`;
            }
          } else {
            saida = 'Nenhuma dose pendente agora. Agradeça e não registre nada.';
          }
        } else if (uso.name === 'pedir_ajuda') {
          const alerta = pedidoDeAjuda(uso.input.motivo);
          await criarEAvisar(db, paciente.id, alerta);
          alertasGerados.push(alerta);
          saida = 'Família avisada agora. Tranquilize e diga que alguém vai entrar em contato.';
        } else if (uso.name === 'proximos_compromissos') {
          const faltam = doses.filter((d) => d.status === 'pendente');
          saida = faltam.length
            ? faltam.map((d) => `${fmtHora(d.previsto_em)}: ${d.horarios?.remedios?.nome}, ${d.horarios?.remedios?.dose}`).join('; ')
            : 'Nenhum remédio pendente hoje.';
        }
        resultados.push({ type: 'tool_result', tool_use_id: uso.id, content: saida });
      }
      messages.push({ role: 'user', content: resultados });
    }
  } catch (erro) {
    console.error('agente: falha no LLM, seguindo com a rede de segurança', erro instanceof Error ? erro.message : erro);
    resposta = FALHA_IA;
  }

  // Rede de segurança: sinal de alerta na fala e nenhum check-in registrado → registra mesmo assim.
  if (!checkinRegistrado && temSinalDeAlerta(sinais)) {
    const novos = await registrarCheckin(db, paciente.id, config, sinais, {
      notas: 'Registrado automaticamente pela rede de segurança.',
    });
    alertasGerados.push(...novos);
    if (novos.length > 0 && resposta === FALHA_IA) {
      resposta = 'Entendi que a senhora não está bem. Já avisei a sua família, tá bom?';
    }
  }

  const revisao = revisarResposta(resposta || FALHA_IA);
  if (revisao.bloqueada) console.warn('agente: resposta bloqueada pela revisão', revisao.motivos);

  // Não entendeu 3 vezes seguidas → avisa a família (regra avaliarNaoEntendeu).
  const naoEntendeu = avaliarNaoEntendeu(contarNaoEntendeu(historico, revisao.texto));
  if (naoEntendeu) {
    try {
      await criarEAvisar(db, paciente.id, naoEntendeu);
      alertasGerados.push(naoEntendeu);
    } catch (erro) {
      console.error('alerta nao_entendeu', erro instanceof Error ? erro.message : erro);
    }
  }

  return json({
    resposta: revisao.texto,
    alertas: alertasGerados.map((a) => ({ nivel: a.nivel, motivo: a.motivo })),
  });
});

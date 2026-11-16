// Edge Function `agente`: a conversa com a Lia.
// O app do idoso transcreve a fala no próprio aparelho e envia o texto; a resposta volta em texto
// e o app a fala com a voz do sistema (expo-speech). Assim o MVP não depende de serviço pago de voz.
//
// Segurança em camadas:
// 1. O LLM extrai sintomas e chama as ferramentas.
// 2. A rede de palavras-chave (sinais.ts) é mesclada ao que o LLM extraiu; o mais grave vence.
// 3. Se o LLM não registrar o check-in mas houver sinal de alerta, o servidor registra sozinho.
// 4. Se o LLM falhar, a rede de segurança ainda registra e alerta.
// 5. A resposta passa por revisao.ts antes de ser falada.
//
// Segredos: LLM_API_KEY (Anthropic). Opcional: LLM_MODEL, NOME_ASSISTENTE.

import { avaliarCheckin, pedidoDeAjuda, type Alerta, type Checkin } from '../_shared/regras/index.ts';
import { deLinha, paraLinha, type LinhaCheckin } from '../_shared/logica/mapeamento.ts';
import { clienteServico, CORS, criarAlerta, json, usuarioDaRequisicao, type Db } from '../_shared/servidor.ts';
import { FERRAMENTAS } from './ferramentas.ts';
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

const fmtHora = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

async function dosesDeHoje(db: Db, pacienteId: string) {
  const inicio = new Date(Date.now() - 12 * 3_600_000).toISOString();
  const fim = new Date(Date.now() + 14 * 3_600_000).toISOString();
  const { data } = await db
    .from('doses')
    .select('id, previsto_em, status, horarios(remedios(nome, dose))')
    .eq('paciente_id', pacienteId)
    .gte('previsto_em', inicio)
    .lte('previsto_em', fim)
    .order('previsto_em');
  return (data ?? []) as any[];
}

async function registrarCheckin(
  db: Db,
  pacienteId: string,
  condicoes: string[],
  limiteFebre: number,
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
  await db.from('checkins').insert(paraLinha(atual, pacienteId, extra));
  const alertas = avaliarCheckin(atual, ((anteriores ?? []) as LinhaCheckin[]).map(deLinha), {
    condicoes,
    limiteFebre,
  });
  for (const a of alertas) await criarAlerta(db, pacienteId, a);
  return alertas;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ erro: 'use POST' }, 405);

  const usuarioId = await usuarioDaRequisicao(req);
  if (!usuarioId) return json({ erro: 'não autorizado' }, 401);

  const corpo = (await req.json().catch(() => null)) as { texto?: string; historico?: Fala[] } | null;
  const texto = corpo?.texto?.trim();
  if (!texto) return json({ erro: 'texto vazio' }, 400);
  const historico = (corpo?.historico ?? []).slice(-12);

  const db = clienteServico();
  const { data: paciente } = await db
    .from('pacientes')
    .select('id, nome, apelido, condicoes, limite_febre')
    .eq('usuario_id', usuarioId)
    .single();
  if (!paciente) return json({ erro: 'aparelho não vinculado' }, 403);
  await db.from('pacientes').update({ ultima_interacao_em: new Date().toISOString() }).eq('id', paciente.id);

  const condicoes: string[] = paciente.condicoes ?? [];
  const limiteFebre = Number(paciente.limite_febre ?? 37.8);
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
      condicoes,
      memoria: memoria ?? [],
      agoraLocal: new Date().toLocaleString('pt-BR', {
        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
      }),
      compromissosHoje: doses.map(
        (d) => `${fmtHora(d.previsto_em)}: ${d.horarios?.remedios?.nome} (${d.status === 'tomado' ? 'já tomou' : 'falta tomar'})`,
      ),
    });

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
      resposta = msg.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join(' ').trim();

      const usos = msg.content.filter((b: any) => b.type === 'tool_use');
      if (usos.length === 0) break;

      const resultados = [];
      for (const uso of usos) {
        let saida = 'ok';
        if (uso.name === 'registrar_checkin') {
          const doLlm = deLinha({ ...(uso.input as object), paciente_id: paciente.id, feito_em: new Date().toISOString() });
          const { feitoEm: _f, ...semData } = doLlm;
          const dados = mesclarSinais(semData, detectarSinais(falasDoIdoso));
          const novos = await registrarCheckin(db, paciente.id, condicoes, limiteFebre, dados, {
            sono: uso.input.sono,
            notas: uso.input.notas,
          });
          alertasGerados.push(...novos);
          checkinRegistrado = true;
          saida = novos.some((a) => a.nivel === 'vermelho' || a.nivel === 'laranja')
            ? 'Registrado. A família foi avisada. Diga isso com calma e oriente procurar o médico.'
            : 'Registrado.';
        } else if (uso.name === 'confirmar_remedio') {
          const pendente = doses
            .filter((d) => d.status === 'pendente' && Date.parse(d.previsto_em) <= Date.now() + 2 * 3_600_000)
            .sort((a, b) => {
              const nome = String(uso.input.remedio ?? '').toLowerCase();
              const casaA = a.horarios?.remedios?.nome?.toLowerCase().includes(nome) ? 0 : 1;
              const casaB = b.horarios?.remedios?.nome?.toLowerCase().includes(nome) ? 0 : 1;
              return casaA - casaB || Date.parse(a.previsto_em) - Date.parse(b.previsto_em);
            })[0];
          if (pendente) {
            await db.from('doses').update({ status: 'tomado', confirmado_em: new Date().toISOString() }).eq('id', pendente.id);
            pendente.status = 'tomado';
            saida = `Confirmado: ${pendente.horarios?.remedios?.nome} das ${fmtHora(pendente.previsto_em)}.`;
          } else {
            saida = 'Nenhuma dose pendente agora. Agradeça e não registre nada.';
          }
        } else if (uso.name === 'pedir_ajuda') {
          const alerta = pedidoDeAjuda(uso.input.motivo);
          await criarAlerta(db, paciente.id, alerta);
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
    console.error('Falha no agente; seguindo só com a rede de segurança', erro);
    resposta = FALHA_IA;
  }

  // Rede de segurança: sinal de alerta na fala e nenhum check-in registrado → registra mesmo assim.
  if (!checkinRegistrado && temSinalDeAlerta(sinais)) {
    const novos = await registrarCheckin(db, paciente.id, condicoes, limiteFebre, sinais, {
      notas: 'Registrado automaticamente pela rede de segurança.',
    });
    alertasGerados.push(...novos);
    if (novos.length > 0 && resposta === FALHA_IA) {
      resposta = 'Entendi que a senhora não está bem. Já avisei a sua família, tá bom?';
    }
  }

  const revisao = revisarResposta(resposta || FALHA_IA);
  if (revisao.bloqueada) console.warn('Resposta da IA bloqueada pela revisão:', revisao.motivos);

  return json({
    resposta: revisao.texto,
    alertas: alertasGerados.map((a) => ({ nivel: a.nivel, motivo: a.motivo })),
  });
});

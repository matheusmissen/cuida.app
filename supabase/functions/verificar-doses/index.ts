// Edge Function verificar-doses — chamada pelo pg_cron a cada minuto.
// Tempos de cada paciente em `pacientes` (tolerancia_dose_min, tolerancia_checkin_min, escalada_min);
// padrão do PRD 30/15/15, e 1/1/1 no modo demonstração (packages/regras, temposDoPaciente).
// 1. Gera as doses de hoje e de amanhã (idempotente).
// 2. Doses sem "Tomei" até a tolerância → alerta laranja ao responsável (motor de regras, avaliarDose).
// 3. Alertas laranja não resolvidos: `escalada_min` depois da criação (ou do último "Reenviar lembrete"), avisa todo o grupo.
//    Confirmar a dose ou fazer o check-in resolve o alerta sozinho (gatilhos no banco), e aí não escala.
// 4. Nenhuma interação do aparelho do idoso em 24 h: alerta vermelho (uma vez por silêncio).
// 5. Check-in diário sem resposta até a tolerância: alerta laranja (uma vez por dia).
// 6. Lembretes para o idoso por web push: remédio no horário (uma vez por dose) e check-in (uma vez por dia).
// 7. Lembretes de consulta para o idoso: no dia anterior (a partir das 10h) e 3 horas antes.
// Só aceita chave de servidor (o cron): service_role antiga ou chave secreta nova (_shared/autorizacao.ts).
// Os apps nunca chamam esta função.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { TEMPOS_PADRAO, temposDoPaciente, type Tempos } from '../../../packages/regras/src/index.ts';
import { aplicarRegraDoPaciente, planejarDoses, type DoseLinha, type RegraPaciente } from '../_shared/doses.ts';
import { checkinsSemResposta } from '../_shared/checkin.ts';
import { proximosDaEscala } from '../_shared/escala.ts';
import { avisarFamilia, carregarCuidadores, criarEAvisar, nomeDoPaciente } from '../_shared/alertar.ts';
import {
  consultasParaLembrar,
  deveLembrarCheckin,
  dosesParaLembrar,
  notificacaoDaConsulta,
  notificacaoDoCheckin,
  notificacaoDoRemedio,
  type DoseParaLembrar,
} from '../_shared/lembretes.ts';
import { notificarUsuarios } from '../_shared/notificar.ts';
import { pacientesEmSilencio } from '../_shared/silencio.ts';
import { autorizadoComoServidor, chavesDeServidor, credenciaisRecebidas, tipoDaChave } from '../_shared/autorizacao.ts';

const MINUTO = 60_000;
const HORA = 60 * MINUTO;

/** paciente_id → tempos (colunas de `pacientes`; ausentes ou inválidas viram o padrão do PRD). */
async function carregarTempos(supabase: SupabaseClient, ids: string[]): Promise<Map<string, Tempos>> {
  const tempos = new Map<string, Tempos>();
  if (ids.length === 0) return tempos;
  const { data, error } = await supabase
    .from('pacientes')
    .select('id, tolerancia_dose_min, tolerancia_checkin_min, escalada_min')
    .in('id', ids);
  if (error) console.error('tempos', error.message); // segue com o padrão
  for (const p of data ?? []) tempos.set(p.id, temposDoPaciente(p));
  return tempos;
}

Deno.serve(async (req) => {
  const chaves = chavesDeServidor({
    serviceRole: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    secretKeysJson: Deno.env.get('SUPABASE_SECRET_KEYS'),
  });
  const recebidas = credenciaisRecebidas({
    authorization: req.headers.get('Authorization'),
    apikey: req.headers.get('apikey'),
  });
  if (!autorizadoComoServidor(recebidas, chaves)) {
    console.warn('verificar-doses: não autorizado', {
      recebidas: recebidas.map(tipoDaChave),
      esperadas: chaves.map(tipoDaChave),
    });
    return new Response('Não autorizado', { status: 401 });
  }
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, chaves[0], {
    auth: { persistSession: false },
  });
  const agora = new Date();

  const { error: erroGerar } = await supabase.rpc('gerar_doses_dia');
  if (erroGerar) console.error('gerar_doses_dia', erroGerar.message);

  // Doses atrasadas de até 24 h (doses mais antigas não geram alerta novo). A partir de 1 min
  // (a menor tolerância possível); a tolerância de cada paciente é aplicada por planejarDoses.
  const { data: linhas, error } = await supabase
    .from('doses')
    .select('id, paciente_id, previsto_em, confirmado_em, horarios!inner(remedios!inner(nome, critico))')
    .eq('status', 'pendente')
    .is('confirmado_em', null)
    .lte('previsto_em', new Date(agora.getTime() - MINUTO).toISOString())
    .gte('previsto_em', new Date(agora.getTime() - 24 * HORA).toISOString());
  if (error) return Response.json({ erro: error.message }, { status: 500 });

  // deno-lint-ignore no-explicit-any
  const doses: DoseLinha[] = (linhas ?? []).map((l: any) => ({
    id: l.id,
    pacienteId: l.paciente_id,
    previstoEm: l.previsto_em,
    confirmadoEm: l.confirmado_em,
    critico: l.horarios.remedios.critico,
    nomeRemedio: l.horarios.remedios.nome,
  }));

  const pacientes = [...new Set(doses.map((d) => d.pacienteId))];
  let regras: RegraPaciente[] = [];
  if (pacientes.length > 0) {
    const { data } = await supabase
      .from('regras')
      .select('id, paciente_id, gatilho, nivel, ativa')
      .in('paciente_id', pacientes)
      .like('gatilho', 'dose.%');
    regras = (data ?? []).map((r) => ({
      id: r.id,
      pacienteId: r.paciente_id,
      gatilho: r.gatilho,
      nivel: r.nivel,
      ativa: r.ativa,
    }));
  }

  const temposDoses = await carregarTempos(supabase, pacientes);
  const plano = planejarDoses(doses, regras, agora, temposDoses);

  let alertasCriados = 0;
  for (const perdida of plano.perdidas) {
    // Marca como perdida antes de alertar; se outra execução já marcou, não alerta de novo.
    const { data: marcada } = await supabase
      .from('doses')
      .update({ status: 'perdido' })
      .eq('id', perdida.doseId)
      .eq('status', 'pendente')
      .is('confirmado_em', null)
      .select('id');
    if (!marcada || marcada.length === 0) continue;
    try {
      await criarEAvisar(supabase, perdida.pacienteId, perdida.alerta, perdida.regraId, { dose_id: perdida.doseId });
      alertasCriados += 1;
    } catch (e) {
      // Sem o alerta, a dose volta para pendente e a próxima execução tenta de novo.
      console.error('criar alerta', e instanceof Error ? e.message : e);
      await supabase.from('doses').update({ status: 'pendente' }).eq('id', perdida.doseId);
    }
  }

  // Escalada dos alertas laranja não vistos nas últimas 24 h: depois de escalada_min, todo o grupo.
  let escalados = 0;
  const { data: abertos } = await supabase
    .from('alertas')
    .select('id, paciente_id, gatilho, nivel, motivo, criado_em, avisados, visto_em, acao_em')
    .eq('nivel', 'laranja')
    .is('visto_em', null)
    .gte('criado_em', new Date(agora.getTime() - 24 * HORA).toISOString());
  const temposEscala = await carregarTempos(supabase, [...new Set((abertos ?? []).map((a) => a.paciente_id))]);
  for (const a of abertos ?? []) {
    const cuidadores = await carregarCuidadores(supabase, a.paciente_id);
    const proximos = proximosDaEscala(
      { nivel: a.nivel, criadoEm: a.criado_em, avisados: a.avisados, vistoEm: a.visto_em, acaoEm: a.acao_em },
      cuidadores,
      agora,
      (temposEscala.get(a.paciente_id) ?? TEMPOS_PADRAO).escaladaMin,
    );
    if (proximos.length === 0) continue;
    await supabase
      .from('alertas')
      .update({ avisados: [...a.avisados, ...proximos.map((c) => c.usuarioId)] })
      .eq('id', a.id);
    const nome = await nomeDoPaciente(supabase, a.paciente_id);
    await avisarFamilia(supabase, { nivel: a.nivel, gatilho: a.gatilho, motivo: a.motivo }, a.id, nome, proximos);
    escalados += proximos.length;
  }

  // Silêncio: nenhuma interação do aparelho do idoso em 24 h (regra avaliarSilencio).
  let silencios = 0;
  const { data: vinculados } = await supabase
    .from('pacientes')
    .select('id, ultima_interacao_em')
    .not('usuario_id', 'is', null)
    .lt('ultima_interacao_em', new Date(agora.getTime() - 24 * HORA).toISOString());
  const lista = (vinculados ?? []) as { id: string; ultima_interacao_em: string | null }[];
  if (lista.length > 0) {
    const { data: avisos } = await supabase
      .from('alertas')
      .select('paciente_id, criado_em')
      .eq('gatilho', 'geral.silencio_24h')
      .in('paciente_id', lista.map((p) => p.id))
      .order('criado_em', { ascending: true });
    const ultimoAviso = new Map<string, string>(
      ((avisos ?? []) as { paciente_id: string; criado_em: string }[]).map((a) => [a.paciente_id, a.criado_em]),
    );
    const parados = pacientesEmSilencio(
      lista.map((p) => ({ id: p.id, ultimaInteracaoEm: p.ultima_interacao_em })),
      ultimoAviso,
      agora,
    );
    for (const s of parados) {
      try {
        await criarEAvisar(supabase, s.pacienteId, s.alerta);
        silencios++;
      } catch (erro) {
        console.error('silencio', erro instanceof Error ? erro.message : erro);
      }
    }
  }

  // Check-in diário: sem resposta até a tolerância do paciente (padrão 15 min) → laranja.
  let checkinsSemResp = 0;
  const { data: comCheckin } = await supabase
    .from('pacientes')
    .select('id, horario_checkin, tolerancia_dose_min, tolerancia_checkin_min, escalada_min')
    .not('usuario_id', 'is', null)
    .not('horario_checkin', 'is', null);
  const ativos = (comCheckin ?? []) as {
    id: string;
    horario_checkin: string;
    tolerancia_dose_min: number;
    tolerancia_checkin_min: number;
    escalada_min: number;
  }[];
  if (ativos.length > 0) {
    const ids = ativos.map((p) => p.id);
    const desde = new Date(agora.getTime() - 48 * HORA).toISOString();
    const [{ data: recentes }, { data: avisosCheckin }, { data: regrasCheckin }] = await Promise.all([
      supabase.from('checkins').select('paciente_id, feito_em').in('paciente_id', ids).gte('feito_em', desde),
      supabase
        .from('alertas')
        .select('paciente_id, criado_em')
        .eq('gatilho', 'geral.checkin_sem_resposta')
        .in('paciente_id', ids)
        .gte('criado_em', desde),
      supabase
        .from('regras')
        .select('id, paciente_id, gatilho, nivel, ativa')
        .eq('gatilho', 'geral.checkin_sem_resposta')
        .in('paciente_id', ids),
    ]);
    const maisRecente = (linhas: { paciente_id: string; em: string }[]) => {
      const m = new Map<string, string>();
      for (const l of linhas) if (!m.has(l.paciente_id) || Date.parse(l.em) > Date.parse(m.get(l.paciente_id)!)) m.set(l.paciente_id, l.em);
      return m;
    };
    const ultimoCheckin = maisRecente(((recentes ?? []) as { paciente_id: string; feito_em: string }[]).map((c) => ({ paciente_id: c.paciente_id, em: c.feito_em })));
    const ultimoAvisoCheckin = maisRecente(((avisosCheckin ?? []) as { paciente_id: string; criado_em: string }[]).map((a) => ({ paciente_id: a.paciente_id, em: a.criado_em })));
    const semResposta = checkinsSemResposta(
      ativos.map((p) => ({
        id: p.id,
        horarioCheckin: p.horario_checkin,
        ultimoCheckinEm: ultimoCheckin.get(p.id) ?? null,
        tempos: temposDoPaciente(p),
      })),
      ultimoAvisoCheckin,
      agora,
    );
    for (const c of semResposta) {
      const r = (regrasCheckin ?? []).find((x) => x.paciente_id === c.pacienteId);
      const { alerta, regraId } = aplicarRegraDoPaciente(
        c.alerta,
        r && { id: r.id, pacienteId: r.paciente_id, gatilho: r.gatilho, nivel: r.nivel, ativa: r.ativa },
      );
      try {
        await criarEAvisar(supabase, c.pacienteId, alerta, regraId);
        checkinsSemResp++;
      } catch (erro) {
        console.error('checkin', erro instanceof Error ? erro.message : erro);
      }
    }
  }

  // Lembretes para o idoso por web push (só chegam se o aparelho ativou as notificações).
  // Remédio: no horário, uma vez por dose, até a tolerância (lembretes.ts, dosesParaLembrar).
  let lembretesRemedio = 0;
  const { data: chegando } = await supabase
    .from('doses')
    .select('id, paciente_id, previsto_em, confirmado_em, lembrete_em, horarios!inner(remedios!inner(nome, dose))')
    .eq('status', 'pendente')
    .is('confirmado_em', null)
    .is('lembrete_em', null)
    .lte('previsto_em', agora.toISOString())
    .gte('previsto_em', new Date(agora.getTime() - 4 * HORA).toISOString());
  // deno-lint-ignore no-explicit-any
  const linhasLembrete = (chegando ?? []) as any[];
  if (linhasLembrete.length > 0) {
    const ids = [...new Set(linhasLembrete.map((l) => l.paciente_id as string))];
    const { data: pacs } = await supabase
      .from('pacientes')
      .select('id, usuario_id, tolerancia_dose_min, tolerancia_checkin_min, escalada_min')
      .in('id', ids);
    const tempos = new Map<string, Tempos>();
    const aparelho = new Map<string, string>();
    for (const p of pacs ?? []) {
      tempos.set(p.id, temposDoPaciente(p));
      if (p.usuario_id) aparelho.set(p.id, p.usuario_id);
    }
    const devidas: DoseParaLembrar[] = linhasLembrete.map((l) => ({
      id: l.id,
      pacienteId: l.paciente_id,
      previstoEm: l.previsto_em,
      confirmadoEm: l.confirmado_em,
      lembreteEm: l.lembrete_em,
    }));
    const lembrar = new Set(dosesParaLembrar(devidas, tempos, agora));
    for (const l of linhasLembrete) {
      const usuario = aparelho.get(l.paciente_id);
      if (!lembrar.has(l.id) || !usuario) continue;
      // Marca antes de mandar; se outra execução já marcou, não manda de novo.
      const { data: marcada } = await supabase
        .from('doses')
        .update({ lembrete_em: agora.toISOString() })
        .eq('id', l.id)
        .is('lembrete_em', null)
        .select('id');
      if (!marcada || marcada.length === 0) continue;
      lembretesRemedio += await notificarUsuarios(
        supabase,
        [usuario],
        'idoso',
        notificacaoDoRemedio(l.id, l.horarios.remedios.nome, l.horarios.remedios.dose),
      );
    }
  }

  // Check-in: no horário, uma vez por dia, se ainda não houve check-in hoje.
  let lembretesCheckin = 0;
  const { data: comHorario } = await supabase
    .from('pacientes')
    .select('id, usuario_id, nome, apelido, horario_checkin, lembrete_checkin_em, tolerancia_dose_min, tolerancia_checkin_min, escalada_min')
    .not('usuario_id', 'is', null)
    .not('horario_checkin', 'is', null);
  // deno-lint-ignore no-explicit-any
  const candidatos = ((comHorario ?? []) as any[]).filter((p) =>
    deveLembrarCheckin(p.horario_checkin, agora, null, p.lembrete_checkin_em, temposDoPaciente(p)),
  );
  if (candidatos.length > 0) {
    const { data: feitos } = await supabase
      .from('checkins')
      .select('paciente_id, feito_em')
      .in('paciente_id', candidatos.map((p) => p.id))
      .gte('feito_em', new Date(agora.getTime() - 48 * HORA).toISOString());
    const ultimo = new Map<string, string>();
    for (const c of (feitos ?? []) as { paciente_id: string; feito_em: string }[]) {
      const atual = ultimo.get(c.paciente_id);
      if (!atual || Date.parse(c.feito_em) > Date.parse(atual)) ultimo.set(c.paciente_id, c.feito_em);
    }
    for (const p of candidatos) {
      if (!deveLembrarCheckin(p.horario_checkin, agora, ultimo.get(p.id) ?? null, p.lembrete_checkin_em, temposDoPaciente(p))) continue;
      await supabase.from('pacientes').update({ lembrete_checkin_em: agora.toISOString() }).eq('id', p.id);
      const apelido = p.apelido || String(p.nome).split(' ')[0];
      lembretesCheckin += await notificarUsuarios(supabase, [p.usuario_id], 'idoso', notificacaoDoCheckin(apelido, agora));
    }
  }

  // Consultas: véspera e 3 horas antes (lembretes.ts, consultasParaLembrar), uma vez cada.
  let lembretesConsulta = 0;
  const { data: proximas } = await supabase
    .from('consultas')
    .select('id, quando, medico, especialidade, local, lembrete_vespera_em, lembrete_horas_em, pacientes!inner(usuario_id, nome, apelido)')
    .gt('quando', agora.toISOString())
    .lte('quando', new Date(agora.getTime() + 40 * HORA).toISOString())
    .or('lembrete_vespera_em.is.null,lembrete_horas_em.is.null');
  // deno-lint-ignore no-explicit-any
  const linhasConsulta = (proximas ?? []) as any[];
  const aLembrar = consultasParaLembrar(
    linhasConsulta.map((c) => ({ id: c.id, quando: c.quando, lembreteVesperaEm: c.lembrete_vespera_em, lembreteHorasEm: c.lembrete_horas_em })),
    agora,
  );
  for (const { id, tipo } of aLembrar) {
    const c = linhasConsulta.find((x) => x.id === id);
    if (!c?.pacientes?.usuario_id) continue;
    const coluna = tipo === 'vespera' ? 'lembrete_vespera_em' : 'lembrete_horas_em';
    // Marca antes de mandar; se outra execução já marcou, não manda de novo.
    const { data: marcada } = await supabase.from('consultas').update({ [coluna]: agora.toISOString() }).eq('id', id).is(coluna, null).select('id');
    if (!marcada || marcada.length === 0) continue;
    const apelido = c.pacientes.apelido || String(c.pacientes.nome).split(' ')[0];
    lembretesConsulta += await notificarUsuarios(supabase, [c.pacientes.usuario_id], 'idoso', notificacaoDaConsulta(tipo, apelido, c));
  }

  return Response.json({
    alertas: alertasCriados,
    escalados,
    silencios,
    checkins_sem_resposta: checkinsSemResp,
    lembretes_remedio: lembretesRemedio,
    lembretes_checkin: lembretesCheckin,
    lembretes_consulta: lembretesConsulta,
  });
});

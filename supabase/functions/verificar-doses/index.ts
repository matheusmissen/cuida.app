// Edge Function verificar-doses — chamada pelo pg_cron a cada 5 minutos.
// 1. Gera as doses de hoje e de amanhã (idempotente).
// 2. Doses sem "Tomei": 30 min → realarme; 60 min → alerta (motor de regras, avaliarDose).
// 3. Alertas laranja não vistos: avisa o próximo da escala a cada 30 min.
// 4. Nenhuma interação do aparelho do idoso em 24 h: alerta vermelho (uma vez por silêncio).
// Só aceita a service role (o cron); os apps nunca chamam esta função.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { planejarDoses, type DoseLinha, type RegraPaciente } from '../_shared/doses.ts';
import { proximosDaEscala } from '../_shared/escala.ts';
import { carregarCuidadores, criarEAvisar, nomeDoPaciente } from '../_shared/alertar.ts';
import { enviarPush, mensagensPush } from '../_shared/push.ts';
import { pacientesEmSilencio } from '../_shared/silencio.ts';

const HORA = 60 * 60_000;

Deno.serve(async (req) => {
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceRole || req.headers.get('Authorization') !== `Bearer ${serviceRole}`) {
    return new Response('Não autorizado', { status: 401 });
  }
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceRole, {
    auth: { persistSession: false },
  });
  const agora = new Date();

  const { error: erroGerar } = await supabase.rpc('gerar_doses_dia');
  if (erroGerar) console.error('gerar_doses_dia', erroGerar.message);

  // Doses atrasadas de até 24 h (doses mais antigas não geram alerta novo).
  const { data: linhas, error } = await supabase
    .from('doses')
    .select('id, paciente_id, previsto_em, confirmado_em, realarmado_em, horarios!inner(remedios!inner(nome, critico))')
    .eq('status', 'pendente')
    .is('confirmado_em', null)
    .lte('previsto_em', new Date(agora.getTime() - HORA / 2).toISOString())
    .gte('previsto_em', new Date(agora.getTime() - 24 * HORA).toISOString());
  if (error) return Response.json({ erro: error.message }, { status: 500 });

  // deno-lint-ignore no-explicit-any
  const doses: DoseLinha[] = (linhas ?? []).map((l: any) => ({
    id: l.id,
    pacienteId: l.paciente_id,
    previstoEm: l.previsto_em,
    confirmadoEm: l.confirmado_em,
    realarmadoEm: l.realarmado_em,
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

  const plano = planejarDoses(doses, regras, agora);

  if (plano.realarmar.length > 0) {
    await supabase
      .from('doses')
      .update({ realarmado_em: agora.toISOString() })
      .in('id', plano.realarmar)
      .is('realarmado_em', null);
  }

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
      await criarEAvisar(supabase, perdida.pacienteId, perdida.alerta, perdida.regraId);
      alertasCriados += 1;
    } catch (e) {
      // Sem o alerta, a dose volta para pendente e a próxima execução tenta de novo.
      console.error('criar alerta', e instanceof Error ? e.message : e);
      await supabase.from('doses').update({ status: 'pendente' }).eq('id', perdida.doseId);
    }
  }

  // Escala dos alertas laranja não vistos nas últimas 24 h.
  let escalados = 0;
  const { data: abertos } = await supabase
    .from('alertas')
    .select('id, paciente_id, gatilho, nivel, motivo, criado_em, avisados, visto_em')
    .eq('nivel', 'laranja')
    .is('visto_em', null)
    .gte('criado_em', new Date(agora.getTime() - 24 * HORA).toISOString());
  for (const a of abertos ?? []) {
    const cuidadores = await carregarCuidadores(supabase, a.paciente_id);
    const proximos = proximosDaEscala(
      { nivel: a.nivel, criadoEm: a.criado_em, avisados: a.avisados, vistoEm: a.visto_em },
      cuidadores,
      agora,
    );
    if (proximos.length === 0) continue;
    await supabase
      .from('alertas')
      .update({ avisados: [...a.avisados, ...proximos.map((c) => c.usuarioId)] })
      .eq('id', a.id);
    const nome = await nomeDoPaciente(supabase, a.paciente_id);
    await enviarPush(
      mensagensPush({ nivel: a.nivel, gatilho: a.gatilho, motivo: a.motivo }, a.id, nome, proximos),
    );
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

  return Response.json({
    realarmes: plano.realarmar.length,
    alertas: alertasCriados,
    escalados,
    silencios,
  });
});

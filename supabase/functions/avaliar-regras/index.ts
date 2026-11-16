// Edge Function `avaliar-regras`: chamada pelo pg_cron a cada minuto.
// 1. Gera as doses de hoje e amanhã.
// 2. Doses sem "Tomei": novo alarme aos 30 min, alerta aos 60 min (regras em packages/regras).
// 3. Nenhuma interação em 24 h: alerta vermelho.
// 4. Alertas laranja sem ninguém ver: avisa o próximo da escala a cada 30 min.
// Não usa LLM: se a IA estiver fora do ar, esta função continua protegendo o idoso.
//
// Publicar: supabase functions deploy avaliar-regras --no-verify-jwt
// Segredo:  supabase secrets set CRON_SECRET=<valor aleatório>

import { avaliarDose, avaliarSilencio, dataLocal } from '../_shared/regras/index.ts';
import { gerarDosesDoDia, type Horario } from '../_shared/logica/doses.ts';
import { mensagemRealarme } from '../_shared/logica/push.ts';
import { alertaRecente, clienteServico, CORS, criarAlerta, enviarPush, json, notificarAlerta } from '../_shared/servidor.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const segredo = Deno.env.get('CRON_SECRET');
  if (!segredo || req.headers.get('x-cron-secret') !== segredo) return json({ erro: 'não autorizado' }, 401);

  const db = clienteServico();
  const agora = new Date();
  const resumo = { dosesGeradas: 0, realarmes: 0, dosesPerdidas: 0, silencios: 0, escalonados: 0 };

  // 1. Doses de hoje e amanhã (idempotente pelo unique horario_id + previsto_em)
  const { data: horarios } = await db
    .from('horarios')
    .select('id, paciente_id, hora, dias_semana, remedios!inner(ativo)')
    .eq('remedios.ativo', true);
  const hoje = dataLocal(agora.toISOString());
  const amanha = dataLocal(new Date(agora.getTime() + 86_400_000).toISOString());
  const novas = [hoje, amanha].flatMap((d) => gerarDosesDoDia((horarios ?? []) as unknown as Horario[], d));
  if (novas.length > 0) {
    const { data } = await db
      .from('doses')
      .upsert(novas, { onConflict: 'horario_id,previsto_em', ignoreDuplicates: true })
      .select('id');
    resumo.dosesGeradas = data?.length ?? 0;
  }

  // 2. Doses pendentes que já passaram do horário
  const { data: pendentes } = await db
    .from('doses')
    .select('id, paciente_id, previsto_em, confirmado_em, realarmado_em, horarios(remedios(nome, dose, critico)), pacientes(expo_push_token)')
    .eq('status', 'pendente')
    .lte('previsto_em', agora.toISOString());

  for (const d of (pendentes ?? []) as any[]) {
    const remedio = d.horarios?.remedios;
    if (!remedio) continue;
    const acao = avaliarDose(
      { previstoEm: d.previsto_em, confirmadoEm: d.confirmado_em, critico: remedio.critico, nomeRemedio: remedio.nome },
      agora,
    );
    if (acao.acao === 'realarmar' && !d.realarmado_em) {
      const token = d.pacientes?.expo_push_token;
      if (token) await enviarPush([mensagemRealarme(token, remedio.nome, remedio.dose)]);
      await db.from('doses').update({ realarmado_em: agora.toISOString() }).eq('id', d.id);
      resumo.realarmes++;
    } else if (acao.acao === 'alertar') {
      await db.from('doses').update({ status: 'perdido' }).eq('id', d.id);
      await criarAlerta(db, d.paciente_id, acao.alerta);
      resumo.dosesPerdidas++;
    }
  }

  // 3. Silêncio de 24 h (só aparelhos já vinculados)
  const limite = new Date(agora.getTime() - 24 * 3_600_000).toISOString();
  const { data: parados } = await db
    .from('pacientes')
    .select('id, ultima_interacao_em')
    .not('usuario_id', 'is', null)
    .lt('ultima_interacao_em', limite);
  for (const p of parados ?? []) {
    const alerta = avaliarSilencio(p.ultima_interacao_em, agora);
    if (alerta && !(await alertaRecente(db, p.id, alerta.gatilho, 24))) {
      await criarAlerta(db, p.id, alerta);
      resumo.silencios++;
    }
  }

  // 4. Escalonamento de alertas laranja ainda não vistos (últimas 3 h)
  const { data: abertos } = await db
    .from('alertas')
    .select('id, paciente_id, nivel, motivo, criado_em, avisados, visto_em')
    .eq('nivel', 'laranja')
    .is('visto_em', null)
    .gte('criado_em', new Date(agora.getTime() - 3 * 3_600_000).toISOString());
  for (const a of abertos ?? []) resumo.escalonados += await notificarAlerta(db, a);

  return json(resumo);
});

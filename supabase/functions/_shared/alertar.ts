// Grava um alerta e avisa a família. Usado por todas as Edge Functions que criam alertas.
// Recebe o cliente com service role (o servidor ignora RLS).

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { Alerta } from '../../../packages/regras/src/index.ts';
import { destinatariosIniciais, quemPodeSerAvisado, type Cuidador } from './escala.ts';
import { notificacaoDoAlerta } from './lembretes.ts';
import { notificarUsuarios } from './notificar.ts';
import { enviarPush, mensagensPush } from './push.ts';

/** Quem do grupo pode receber alertas deste paciente (respeita o consentimento do idoso). */
export async function carregarCuidadores(supabase: SupabaseClient, pacienteId: string): Promise<Cuidador[]> {
  const [{ data, error }, { data: paciente }] = await Promise.all([
    supabase.from('cuidadores').select('usuario_id, papel, ordem_escala, expo_push_token').eq('paciente_id', pacienteId),
    supabase.from('pacientes').select('consente_familia_em').eq('id', pacienteId).maybeSingle(),
  ]);
  if (error) throw error;
  const cuidadores: Cuidador[] = (data ?? []).map((c) => ({
    usuarioId: c.usuario_id,
    papel: c.papel,
    ordemEscala: c.ordem_escala,
    pushToken: c.expo_push_token,
  }));
  return quemPodeSerAvisado(cuidadores, Boolean(paciente?.consente_familia_em));
}

export async function nomeDoPaciente(supabase: SupabaseClient, pacienteId: string): Promise<string> {
  const { data } = await supabase.from('pacientes').select('nome, apelido').eq('id', pacienteId).single();
  return data?.apelido || data?.nome || 'Paciente';
}

/**
 * Avisa as pessoas do grupo: web push nos navegadores inscritos (app da família) e push do Expo
 * (aparelhos nativos com token). Falha de envio nunca desfaz o alerta, que já está no painel.
 */
export async function avisarFamilia(
  supabase: SupabaseClient,
  alerta: Alerta,
  alertaId: string,
  nomePaciente: string,
  destinatarios: Cuidador[],
): Promise<void> {
  if (destinatarios.length === 0) return;
  await Promise.all([
    notificarUsuarios(supabase, destinatarios.map((c) => c.usuarioId), 'familia', notificacaoDoAlerta(alerta, alertaId, nomePaciente)),
    enviarPush(mensagensPush(alerta, alertaId, nomePaciente, destinatarios)),
  ]);
}

export async function criarEAvisar(
  supabase: SupabaseClient,
  pacienteId: string,
  alerta: Alerta,
  regraId: string | null = null,
  /** Colunas extras do alerta, por exemplo { dose_id } para alertas de dose. */
  extras: Record<string, unknown> = {},
): Promise<string> {
  const cuidadores = await carregarCuidadores(supabase, pacienteId);
  const destinatarios = destinatariosIniciais(alerta.nivel, cuidadores);
  const { data, error } = await supabase
    .from('alertas')
    .insert({
      paciente_id: pacienteId,
      regra_id: regraId,
      gatilho: alerta.gatilho,
      nivel: alerta.nivel,
      motivo: alerta.motivo,
      avisados: destinatarios.map((c) => c.usuarioId),
      ...extras,
    })
    .select('id')
    .single();
  if (error) throw error;
  if (destinatarios.length > 0) {
    const nome = await nomeDoPaciente(supabase, pacienteId);
    await avisarFamilia(supabase, alerta, data.id, nome, destinatarios);
  }
  return data.id;
}

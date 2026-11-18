// Ações da tela do alerta (docs/PRD.md, seção 10, tela 6). A lógica pura fica em @cuida/cliente (alertas.ts).
import type { PessoaDoGrupo } from '@cuida/cliente';
import { supabase } from '@/lib/supabase';

/** Pessoas do grupo de cuidado (a RLS só mostra para quem é do grupo). */
export async function carregarGrupo(pacienteId: string): Promise<PessoaDoGrupo[]> {
  const { data } = await supabase
    .from('cuidadores')
    .select('usuario_id, nome_exibicao, papel')
    .eq('paciente_id', pacienteId);
  return (data ?? []) as PessoaDoGrupo[];
}

export type ResultadoReenvio =
  | { tipo: 'enviado' }
  | { tipo: 'sem_avisos' }
  | { tipo: 'resolvido' }
  | { tipo: 'sem_celular' }
  | { tipo: 'erro'; mensagem: string };

/** "Reenviar lembrete": manda de novo para o celular do idoso e adia o aviso ao grupo. */
export async function reenviarLembrete(alertaId: string): Promise<ResultadoReenvio> {
  const { data, error } = await supabase.functions.invoke('reenviar-lembrete', { body: { alerta_id: alertaId } });
  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    if (status === 409) return { tipo: 'sem_celular' };
    return { tipo: 'erro', mensagem: 'Não foi possível reenviar agora. Tente de novo.' };
  }
  const r = data as { enviadas?: number; resolvido?: boolean };
  if (r.resolvido) return { tipo: 'resolvido' };
  return r.enviadas && r.enviadas > 0 ? { tipo: 'enviado' } : { tipo: 'sem_avisos' };
}

/** "Já falei com ela, está tudo bem": resolve o alerta e para a escalada. */
export async function resolverPelaFamilia(alertaId: string, usuarioId: string | undefined): Promise<string | null> {
  const { error } = await supabase
    .from('alertas')
    .update({ visto_em: new Date().toISOString(), visto_por: usuarioId ?? null, resolucao: 'familia' })
    .eq('id', alertaId)
    .is('visto_em', null);
  return error ? error.message : null;
}

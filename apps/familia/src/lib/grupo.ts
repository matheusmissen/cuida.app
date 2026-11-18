// Grupo de cuidado no banco (docs/PRD.md, seção 2). A lógica pura fica em @cuida/cliente (grupo.ts);
// as regras de quem pode o quê ficam nas funções do banco (migration 20261130120000_grupo_de_cuidado.sql).
import type { MembroDoGrupo } from '@cuida/cliente';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const CHAVE_CONVITE = 'cuida.convite_pendente';

export async function carregarMembros(pacienteId: string): Promise<MembroDoGrupo[]> {
  const { data } = await supabase
    .from('cuidadores')
    .select('usuario_id, nome_exibicao, papel, ordem_escala')
    .eq('paciente_id', pacienteId);
  return (data ?? []) as MembroDoGrupo[];
}

/** Gera um convite (só o responsável principal). */
export async function criarConvite(pacienteId: string): Promise<{ codigo?: string; erro?: string }> {
  const { data, error } = await supabase.rpc('criar_convite', { p_paciente: pacienteId });
  return error ? { erro: error.message } : { codigo: data as string };
}

export async function aceitarConvite(codigo: string, nome: string): Promise<string | null> {
  const { error } = await supabase.rpc('aceitar_convite', { p_codigo: codigo, p_nome: nome });
  return error ? error.message : null;
}

export async function passarResponsabilidade(pacienteId: string, usuarioId: string): Promise<string | null> {
  const { error } = await supabase.rpc('passar_responsabilidade', { p_paciente: pacienteId, p_novo: usuarioId });
  return error ? error.message : null;
}

export async function sairOuRemover(pacienteId: string, usuarioId: string): Promise<string | null> {
  const { error } = await supabase.rpc('sair_ou_remover_do_grupo', { p_paciente: pacienteId, p_usuario: usuarioId });
  return error ? error.message : null;
}

/** "Seu nome no grupo" (aparece para os outros e em "Quem foi avisado"). */
export async function salvarMeuNome(pacienteId: string, usuarioId: string, nome: string): Promise<string | null> {
  const { error } = await supabase
    .from('cuidadores')
    .update({ nome_exibicao: nome.trim().slice(0, 60) || null })
    .eq('paciente_id', pacienteId)
    .eq('usuario_id', usuarioId);
  return error ? error.message : null;
}

/** Convite aberto antes de entrar na conta: fica guardado até a pessoa entrar. */
export async function guardarConvitePendente(codigo: string | null): Promise<void> {
  try {
    if (codigo) await AsyncStorage.setItem(CHAVE_CONVITE, codigo);
    else await AsyncStorage.removeItem(CHAVE_CONVITE);
  } catch {
    // sem armazenamento: a pessoa digita o código depois
  }
}

export async function lerConvitePendente(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(CHAVE_CONVITE);
  } catch {
    return null;
  }
}

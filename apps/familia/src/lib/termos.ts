// Termos do familiar: a pessoa aceita a versão atual (VERSAO_TERMOS) uma vez; o banco guarda a hora.
// Quem marcou a caixa ao criar a conta, mas ainda precisava confirmar o e-mail, tem o aceite gravado
// sozinho no primeiro login (a versão vai junto no cadastro, em user_metadata.termos_versao).
import { precisaAceitarTermos, VERSAO_TERMOS } from '@cuida/cliente';
import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

export async function aceitarTermos(): Promise<boolean> {
  const { error } = await supabase.rpc('aceitar_termos', { p_versao: VERSAO_TERMOS });
  if (error) console.warn('termos:', error.message);
  return !error;
}

export function useTermos(sessao: Session | null) {
  const [estado, setEstado] = useState<'carregando' | 'aceito' | 'falta'>('carregando');
  const usuario = sessao?.user.id ?? null;
  const marcouNoCadastro = sessao?.user.user_metadata?.termos_versao === VERSAO_TERMOS;

  useEffect(() => {
    if (!usuario) return setEstado('carregando');
    let ativo = true;
    (async () => {
      const { data, error } = await supabase.from('termos_aceitos').select('versao').eq('usuario_id', usuario);
      if (!ativo) return;
      // Sem internet: não trava o app (pergunta de novo na próxima vez).
      if (error) return setEstado('aceito');
      if (!precisaAceitarTermos((data ?? []).map((l) => l.versao as string))) return setEstado('aceito');
      if (marcouNoCadastro && (await aceitarTermos())) return ativo && setEstado('aceito');
      if (ativo) setEstado('falta');
    })();
    return () => {
      ativo = false;
    };
  }, [usuario, marcouNoCadastro]);

  const aceitar = useCallback(async () => {
    const ok = await aceitarTermos();
    if (ok) setEstado('aceito');
    return ok;
  }, []);

  return { estado, aceitar };
}

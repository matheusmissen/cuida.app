// Notificações no navegador (web push) deste app. A lógica fica em @cuida/cliente (notificacoes.ts).
import {
  ativarNotificacoes,
  ehIphone,
  estaInstalado,
  lerSituacao,
  navegadorDoBrowser,
  type DadosInscricao,
  type EstadoNotificacoes,
} from '@cuida/cliente';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

const APP = 'familia' as const;

async function salvar(d: DadosInscricao): Promise<void> {
  const { error } = await supabase.rpc('salvar_inscricao_push', {
    p_endpoint: d.endpoint,
    p_p256dh: d.p256dh,
    p_auth: d.auth,
    p_app: APP,
  });
  if (error) throw error;
}

/** Situação das notificações neste aparelho e a ação de ativar (chame `ativar` direto no toque do botão). */
export function useNotificacoes() {
  const [estado, setEstado] = useState<EstadoNotificacoes | null>(null);
  const [ativando, setAtivando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      setEstado('sem_suporte'); // no celular nativo, o caminho é o expo-notifications
      return;
    }
    let vivo = true;
    const nav = navegadorDoBrowser();
    const g = globalThis as unknown as { navigator?: Navigator; matchMedia?: (c: string) => MediaQueryList };
    const iphone = ehIphone(g.navigator?.userAgent ?? '', g.navigator?.maxTouchPoints ?? 0);
    lerSituacao(nav, iphone, estaInstalado(g, g.navigator as never)).then(async (e) => {
      if (!vivo) return;
      setEstado(e);
      // Já ativas: salva de novo (garante que a inscrição está ligada a esta conta no servidor).
      if (e === 'ativas' && nav) await ativarNotificacoes(nav, salvar).catch(() => {});
    });
    return () => {
      vivo = false;
    };
  }, []);

  const ativar = useCallback(async () => {
    const nav = navegadorDoBrowser();
    if (!nav) return;
    setErro(null);
    setAtivando(true);
    try {
      setEstado(await ativarNotificacoes(nav, salvar));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível ativar as notificações.');
    } finally {
      setAtivando(false);
    }
  }, []);

  return { estado, ativar, ativando, erro };
}

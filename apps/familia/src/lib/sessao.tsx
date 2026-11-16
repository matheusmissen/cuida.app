import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';

interface Sessao {
  sessao: Session | null;
  carregando: boolean;
}

const Contexto = createContext<Sessao>({ sessao: null, carregando: true });

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Sessao>({ sessao: null, carregando: true });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEstado({ sessao: data.session, carregando: false }));
    const { data } = supabase.auth.onAuthStateChange((_evento, sessao) =>
      setEstado({ sessao, carregando: false }),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  return <Contexto.Provider value={estado}>{children}</Contexto.Provider>;
}

export const useSessao = () => useContext(Contexto);

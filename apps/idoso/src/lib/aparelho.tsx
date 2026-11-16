// O aparelho do idoso entra anonimamente e se vincula ao paciente pelo código/QR da família.
import { SELECT_PACIENTE, type Paciente } from '@cuida/cliente';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { supabase } from './supabase';

interface EstadoAparelho {
  carregando: boolean;
  paciente: Paciente | null;
  erro: string | null;
  vincular: (codigo: string) => Promise<string | null>;
}

const Contexto = createContext<EstadoAparelho>({
  carregando: true,
  paciente: null,
  erro: null,
  vincular: async () => null,
});

async function buscarPaciente(usuarioId: string): Promise<Paciente | null> {
  const { data } = await supabase
    .from('pacientes')
    .select(SELECT_PACIENTE)
    .eq('usuario_id', usuarioId)
    .maybeSingle();
  return (data as Paciente | null) ?? null;
}

export function AparelhoProvider({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true);
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      let { data } = await supabase.auth.getSession();
      if (!data.session) {
        const anonimo = await supabase.auth.signInAnonymously();
        if (anonimo.error) {
          setErro('Sem conexão. Verifique a internet e abra o app de novo.');
          setCarregando(false);
          return;
        }
        data = { session: anonimo.data.session };
      }
      if (data.session) setPaciente(await buscarPaciente(data.session.user.id));
      setCarregando(false);
    })();
  }, []);

  // A família pode mudar dados do paciente (por exemplo, o horário do check-in): relê de tempos em tempos.
  const vinculado = Boolean(paciente);
  useEffect(() => {
    if (!vinculado) return;
    const reler = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const atual = await buscarPaciente(data.session.user.id);
      if (atual) setPaciente(atual);
    };
    const timer = setInterval(reler, 5 * 60_000);
    const app = AppState.addEventListener('change', (e) => e === 'active' && reler());
    return () => {
      clearInterval(timer);
      app.remove();
    };
  }, [vinculado]);

  const vincular = useCallback(async (codigo: string): Promise<string | null> => {
    const { error } = await supabase.rpc('vincular_aparelho', { p_codigo: codigo });
    if (error) {
      return error.message.includes('inválido')
        ? 'Esse código não funcionou. Peça um código novo para a sua família.'
        : 'Não consegui conectar. Verifique a internet e tente de novo.';
    }
    const { data } = await supabase.auth.getUser();
    if (data.user) setPaciente(await buscarPaciente(data.user.id));
    return null;
  }, []);

  return (
    <Contexto.Provider value={{ carregando, paciente, erro, vincular }}>{children}</Contexto.Provider>
  );
}

export const useAparelho = () => useContext(Contexto);

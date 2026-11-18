import { SELECT_PACIENTE, type Paciente, type Papel } from '@cuida/cliente';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useSessao } from './sessao';
import { supabase } from './supabase';

interface EstadoPaciente {
  paciente: Paciente | null;
  /** Papel de quem está logado no grupo deste paciente. */
  papel: Papel | null;
  carregando: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
}

const Contexto = createContext<EstadoPaciente>({
  paciente: null,
  papel: null,
  carregando: true,
  erro: null,
  recarregar: async () => {},
});

/** Paciente cuidado pelo usuário logado (no MVP, o primeiro do círculo). */
export function PacienteProvider({ children }: { children: ReactNode }) {
  const { sessao } = useSessao();
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [papel, setPapel] = useState<Papel | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    if (!sessao) {
      setPaciente(null);
      setPapel(null);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    const { data, error } = await supabase
      .from('cuidadores')
      .select(`papel, pacientes(${SELECT_PACIENTE})`)
      .eq('usuario_id', sessao.user.id)
      .order('criado_em')
      .limit(1)
      .maybeSingle();
    setErro(error ? error.message : null);
    setPaciente((data?.pacientes as unknown as Paciente | null) ?? null);
    setPapel((data?.papel as Papel | undefined) ?? null);
    setCarregando(false);
  }, [sessao]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return (
    <Contexto.Provider value={{ paciente, papel, carregando, erro, recarregar }}>{children}</Contexto.Provider>
  );
}

export const usePaciente = () => useContext(Contexto);

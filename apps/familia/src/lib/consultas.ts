// Consultas no Supabase (tabela consultas). A lógica pura fica em @cuida/cliente (consultas.ts).
import { SELECT_CONSULTA, type ConsultaLinha } from '@cuida/cliente';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

export function useConsultas(pacienteId: string | undefined) {
  const [consultas, setConsultas] = useState<ConsultaLinha[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    if (!pacienteId) return;
    const { data, error } = await supabase
      .from('consultas')
      .select(SELECT_CONSULTA)
      .eq('paciente_id', pacienteId)
      .gte('quando', new Date(Date.now() - 60 * 24 * 3_600_000).toISOString())
      .order('quando');
    if (error) return setErro('Não foi possível carregar as consultas.');
    setErro(null);
    setConsultas((data as ConsultaLinha[]) ?? []);
  }, [pacienteId]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { consultas, erro, recarregar };
}

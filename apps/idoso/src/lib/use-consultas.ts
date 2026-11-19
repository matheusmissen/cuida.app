// Próxima consulta do idoso (só lê; quem cadastra é a família). Relê de tempos em tempos.
import { consultaPerto, SELECT_CONSULTA, type ConsultaLinha } from '@cuida/cliente';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

export function useProximaConsulta(pacienteId: string, agora: Date): ConsultaLinha | null {
  const [consultas, setConsultas] = useState<ConsultaLinha[]>([]);
  const recarregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('consultas')
      .select(SELECT_CONSULTA)
      .eq('paciente_id', pacienteId)
      .gte('quando', new Date(Date.now() - 3_600_000).toISOString())
      .order('quando')
      .limit(5);
    if (!error) setConsultas((data as ConsultaLinha[]) ?? []);
  }, [pacienteId]);
  useEffect(() => {
    recarregar();
    const timer = setInterval(recarregar, 10 * 60_000);
    return () => clearInterval(timer);
  }, [recarregar]);
  return consultaPerto(consultas, agora);
}

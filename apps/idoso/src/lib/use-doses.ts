import { SELECT_DOSE, type DoseComRemedio } from '@cuida/cliente';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { agendarAlarmes } from './alarmes';
import { supabase } from './supabase';

const HORA = 60 * 60_000;

/** Conta para a regra de silêncio de 24 h. O builder do supabase-js só executa com then/await. */
function registrarInteracao() {
  supabase.rpc('registrar_interacao').then(({ error }) => {
    if (error) console.warn('registrar_interacao:', error.message);
  });
}

/** Doses das últimas 6 h e das próximas 48 h, atualizadas a cada minuto e ao voltar para o app. */
export function useDoses(pacienteId: string) {
  const [doses, setDoses] = useState<DoseComRemedio[]>([]);
  const [agora, setAgora] = useState(new Date());
  const assinatura = useRef('');

  const carregar = useCallback(async () => {
    const t = Date.now();
    const { data, error } = await supabase
      .from('doses')
      .select(SELECT_DOSE)
      .eq('paciente_id', pacienteId)
      .gte('previsto_em', new Date(t - 6 * HORA).toISOString())
      .lte('previsto_em', new Date(t + 48 * HORA).toISOString())
      .order('previsto_em');
    if (error) return; // sem internet: mantém as doses e os alarmes já agendados
    const lista = (data as unknown as DoseComRemedio[]) ?? [];
    setDoses(lista);
    const nova = lista.map((d) => `${d.id}:${d.confirmado_em ?? ''}`).join('|');
    if (nova !== assinatura.current) {
      assinatura.current = nova;
      agendarAlarmes(lista).catch((e) => console.warn('Alarmes:', e?.message ?? e));
    }
  }, [pacienteId]);

  useEffect(() => {
    supabase.rpc('gerar_doses_hoje', { p_paciente: pacienteId }).then(carregar);
    registrarInteracao();
    const busca = setInterval(carregar, 60_000);
    const relogio = setInterval(() => setAgora(new Date()), 10_000);
    const app = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') {
        setAgora(new Date());
        carregar();
        registrarInteracao();
      }
    });
    return () => {
      clearInterval(busca);
      clearInterval(relogio);
      app.remove();
    };
  }, [pacienteId, carregar]);

  const confirmar = useCallback(
    async (doseId: string): Promise<boolean> => {
      const momento = new Date().toISOString();
      const anterior = doses.find((d) => d.id === doseId);
      // Otimista: o alarme some na hora; se falhar, volta.
      setDoses((atual) => atual.map((d) => (d.id === doseId ? { ...d, confirmado_em: momento, status: 'tomado' } : d)));
      const { error } = await supabase.rpc('confirmar_dose', { p_dose: doseId });
      if (error) {
        if (anterior) setDoses((atual) => atual.map((d) => (d.id === doseId ? anterior : d)));
        return false;
      }
      carregar();
      return true;
    },
    [carregar, doses],
  );

  return { doses, agora, confirmar };
}

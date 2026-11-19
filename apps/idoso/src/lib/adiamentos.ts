// "Me lembre daqui a 10 minutos": guarda até quando cada alarme fica escondido (sobrevive a fechar o app)
// e, no celular, agenda um alarme local para a volta. Também grava no servidor (adiar_dose), para o lembrete
// voltar por notificação mesmo com o app fechado. A regra está em packages/cliente/src/comprimido.ts.
import { adiar, ADIAR_MINUTOS, estaAdiada, type Adiamentos, type DoseComRemedio } from '@cuida/cliente';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { agendarAdiado } from './alarmes';
import { supabase } from './supabase';

const CHAVE = 'cuida.adiamentos';

export function useAdiamentos() {
  const [adiamentos, setAdiamentos] = useState<Adiamentos>({});

  useEffect(() => {
    AsyncStorage.getItem(CHAVE)
      .then((v) => v && setAdiamentos(JSON.parse(v) as Adiamentos))
      .catch(() => {});
  }, []);

  const adiarDose = useCallback(async (dose: DoseComRemedio) => {
    const agora = new Date();
    const novos = adiar(adiamentos, dose.id, agora);
    setAdiamentos(novos);
    AsyncStorage.setItem(CHAVE, JSON.stringify(novos)).catch(() => {});
    agendarAdiado(dose, new Date(agora.getTime() + ADIAR_MINUTOS * 60_000)).catch((e) =>
      console.warn('Adiar:', e?.message ?? e),
    );
    // Se falhar (sem internet), o adiamento local continua valendo com o app aberto.
    supabase
      .rpc('adiar_dose', { p_dose: dose.id, p_minutos: ADIAR_MINUTOS })
      .then(({ error }) => error && console.warn('Adiar no servidor:', error.message));
  }, [adiamentos]);

  const adiada = useCallback((doseId: string, agora: Date) => estaAdiada(adiamentos, doseId, agora), [adiamentos]);

  return { adiada, adiarDose };
}

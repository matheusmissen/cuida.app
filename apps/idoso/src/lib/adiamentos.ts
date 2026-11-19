// "Me lembre daqui a 10 minutos": guarda até quando cada alarme fica escondido (sobrevive a fechar o app)
// e, no celular, agenda um alarme local para a volta. A regra está em packages/cliente/src/comprimido.ts.
import { adiar, ADIAR_MINUTOS, estaAdiada, type Adiamentos, type DoseComRemedio } from '@cuida/cliente';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { agendarAdiado } from './alarmes';

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
  }, [adiamentos]);

  const adiada = useCallback((doseId: string, agora: Date) => estaAdiada(adiamentos, doseId, agora), [adiamentos]);

  return { adiada, adiarDose };
}

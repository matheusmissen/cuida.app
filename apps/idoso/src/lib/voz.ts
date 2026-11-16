// Toda resposta da assistente sai em voz e em texto grande:
// falar() lê em voz alta e guarda a frase para a tela mostrar (useUltimaFala).
import * as Speech from 'expo-speech';
import { useSyncExternalStore } from 'react';

export const NOME_ASSISTENTE = 'Lia';

let ultima: string | null = null;
const ouvintes = new Set<() => void>();

export function falar(texto: string): void {
  ultima = texto;
  ouvintes.forEach((o) => o());
  Speech.stop();
  Speech.speak(texto, { language: 'pt-BR', rate: 0.9 });
}

export function useUltimaFala(): string | null {
  return useSyncExternalStore(
    (ouvinte) => {
      ouvintes.add(ouvinte);
      return () => ouvintes.delete(ouvinte);
    },
    () => ultima,
    () => ultima,
  );
}

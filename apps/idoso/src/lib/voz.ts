// Toda resposta da assistente sai em voz e em texto grande:
// falar() lê em voz alta e guarda a frase para a tela mostrar (useUltimaFala).
// useFalando() diz se a Lia está falando agora (para as barrinhas da tela).
import * as Speech from 'expo-speech';
import { useSyncExternalStore } from 'react';

export const NOME_ASSISTENTE = 'Lia';

export interface UltimaFala {
  texto: string;
  /** Date.now() de quando a Lia falou. */
  em: number;
}

let ultima: UltimaFala | null = null;
let falando = false;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((o) => o());
const assinar = (ouvinte: () => void) => {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
};
const mudarFalando = (valor: boolean) => {
  if (falando !== valor) {
    falando = valor;
    avisar();
  }
};

export function falar(texto: string): void {
  ultima = { texto, em: Date.now() };
  Speech.stop();
  mudarFalando(true);
  avisar();
  Speech.speak(texto, {
    language: 'pt-BR',
    rate: 0.9,
    onDone: () => mudarFalando(false),
    onStopped: () => mudarFalando(false),
    onError: () => mudarFalando(false),
  });
}

/** Cala a Lia (antes de ouvir o microfone, para ela não ouvir a si mesma). */
export function pararFala(): void {
  Speech.stop();
  mudarFalando(false);
}

export function useUltimaFala(): UltimaFala | null {
  return useSyncExternalStore(assinar, () => ultima, () => ultima);
}

export function useFalando(): boolean {
  return useSyncExternalStore(assinar, () => falando, () => falando);
}

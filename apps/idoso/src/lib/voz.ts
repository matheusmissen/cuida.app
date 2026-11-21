// Toda resposta da assistente sai em voz e em texto grande:
// falar() lê em voz alta e guarda a frase para a tela mostrar (useUltimaFala).
// useFalando() diz se a Lia está falando agora (para as barrinhas da tela).
// A voz é sempre de português do Brasil, de preferência feminina e natural (escolherVozDaLia, @cuida/cliente):
// sem escolher, alguns navegadores usavam a primeira voz em português, às vezes a de Portugal.
import { escolherVozDaLia } from '@cuida/cliente';
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
/** Identificador da voz escolhida (null enquanto as vozes não chegaram ou se não houver voz do Brasil). */
let vozDaLia: string | null = null;

function carregarVozes(): void {
  Speech.getAvailableVoicesAsync()
    .then((vozes) => {
      vozDaLia = escolherVozDaLia(
        vozes.map((v) => ({ identifier: v.identifier, name: v.name, language: v.language })),
      );
    })
    .catch(() => {});
}

// O navegador entrega as vozes aos poucos (as "naturais" do Edge chegam depois): escolhe de novo a cada mudança.
const sintese = (globalThis as { speechSynthesis?: { addEventListener?: (e: string, f: () => void) => void } }).speechSynthesis;
sintese?.addEventListener?.('voiceschanged', carregarVozes);
carregarVozes();

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
    // Só passa a voz quando há uma do Brasil (sem isso, o expo-speech poderia cair na primeira voz da lista).
    ...(vozDaLia ? { voice: vozDaLia } : {}),
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

// Na web, a transcrição usa a Web Speech API do navegador (Chrome, Edge, Safari).
import { criarAcumuladorDeFala, mensagemErroEscuta } from '@cuida/cliente';
import type { OuvintesDaEscuta } from './escuta';

export type { OuvintesDaEscuta } from './escuta';

interface ResultadoWeb {
  isFinal: boolean;
  0: { transcript: string };
}
interface EventoResultado {
  resultIndex: number;
  results: ArrayLike<ResultadoWeb>;
}
interface ReconhecimentoWeb {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: EventoResultado) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type ConstrutorReconhecimento = new () => ReconhecimentoWeb;

function construtor(): ConstrutorReconhecimento | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: ConstrutorReconhecimento;
    webkitSpeechRecognition?: ConstrutorReconhecimento;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function escutaDisponivel(): boolean {
  return construtor() !== null;
}

/** O navegador pede a permissão do microfone sozinho ao começar a ouvir. */
export async function pedirPermissaoDeEscuta(): Promise<boolean> {
  return escutaDisponivel();
}

export function ouvir(o: OuvintesDaEscuta): () => void {
  const Reconhecimento = construtor();
  if (!Reconhecimento) {
    o.erro(mensagemErroEscuta('service-not-allowed')!);
    o.fim();
    return () => {};
  }
  const acumulador = criarAcumuladorDeFala();
  const r = new Reconhecimento();
  r.lang = 'pt-BR';
  r.interimResults = true;
  r.continuous = false;
  r.maxAlternatives = 1;
  r.onresult = (e) => {
    let visivel = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      visivel = acumulador.resultado(e.results[i][0].transcript, e.results[i].isFinal);
    }
    o.parcial(visivel);
  };
  r.onerror = (e) => {
    acumulador.erro();
    const mensagem = mensagemErroEscuta(e.error);
    if (mensagem) o.erro(mensagem);
  };
  r.onend = () => {
    const texto = acumulador.fim();
    if (texto) o.final(texto);
    o.fim();
  };
  try {
    r.start();
  } catch {
    o.erro(mensagemErroEscuta('desconhecido')!);
    o.fim();
  }
  return () => r.stop();
}

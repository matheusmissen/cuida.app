// Transcrição da fala no próprio aparelho (Android/iOS), com expo-speech-recognition
// (MIT, https://github.com/jamsch/expo-speech-recognition). Precisa de build de desenvolvimento EAS.
import { criarAcumuladorDeFala, mensagemErroEscuta } from '@cuida/cliente';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

export interface OuvintesDaEscuta {
  /** Texto que está sendo ouvido, para mostrar na tela enquanto a pessoa fala. */
  parcial: (texto: string) => void;
  /** Fala completa, entregue uma vez no fim. */
  final: (texto: string) => void;
  /** Frase para a Lia dizer quando algo deu errado. */
  erro: (mensagem: string) => void;
  /** Escuta terminou (com ou sem fala). */
  fim: () => void;
}

export function escutaDisponivel(): boolean {
  try {
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    return false;
  }
}

export async function pedirPermissaoDeEscuta(): Promise<boolean> {
  const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  return granted;
}

/** Começa a ouvir. Devolve a função que encerra a escuta (o que foi dito é entregue em `final`). */
export function ouvir(o: OuvintesDaEscuta): () => void {
  const acumulador = criarAcumuladorDeFala();
  const inscricoes = [
    ExpoSpeechRecognitionModule.addListener('result', (e) => {
      o.parcial(acumulador.resultado(e.results[0]?.transcript ?? '', e.isFinal));
    }),
    ExpoSpeechRecognitionModule.addListener('error', (e) => {
      acumulador.erro();
      const mensagem = mensagemErroEscuta(e.error);
      if (mensagem) o.erro(mensagem);
    }),
    ExpoSpeechRecognitionModule.addListener('end', () => {
      inscricoes.forEach((i) => i.remove());
      const texto = acumulador.fim();
      if (texto) o.final(texto);
      o.fim();
    }),
  ];
  ExpoSpeechRecognitionModule.start({
    lang: 'pt-BR',
    interimResults: true,
    continuous: false,
    addsPunctuation: true,
    // Prefere reconhecer no próprio aparelho quando o sistema oferece.
    requiresOnDeviceRecognition: ExpoSpeechRecognitionModule.supportsOnDeviceRecognition(),
  });
  return () => ExpoSpeechRecognitionModule.stop();
}

// Conversa com a Lia (sem React Native): testado em Node.
// O aparelho transcreve a fala, manda o texto e o histórico para a Edge Function `agente`
// e fala a resposta. Contrato da função:
//   entrada { texto, historico: [{ papel: 'idoso' | 'lia', texto }] }
//   saída   { resposta, alertas: [{ nivel, motivo }] }
import type { Nivel } from '@cuida/regras';

export interface Fala {
  papel: 'idoso' | 'lia';
  texto: string;
}

export interface RespostaAgente {
  resposta: string;
  alertas: { nivel: Nivel; motivo: string }[];
}

/** O agente usa no máximo as 12 últimas falas; mandamos só essas. */
export const MAX_HISTORICO = 12;

export const FRASE_SEM_CONEXAO =
  'Não consegui falar com a Lia agora. Verifique a internet e aperte o botão de novo.';

export function adicionarFala(historico: Fala[], fala: Fala, max = MAX_HISTORICO): Fala[] {
  const texto = fala.texto.trim();
  if (!texto) return historico;
  return [...historico, { papel: fala.papel, texto }].slice(-max);
}

/** Corpo do POST para o agente: a fala nova vai em `texto`, o histórico não a repete. */
export function corpoDoAgente(texto: string, historico: Fala[]): { texto: string; historico: Fala[] } {
  return { texto: texto.trim(), historico: historico.slice(-MAX_HISTORICO) };
}

/** Valida a resposta do agente; qualquer coisa fora do contrato vira null. */
export function lerRespostaDoAgente(dados: unknown): RespostaAgente | null {
  if (!dados || typeof dados !== 'object') return null;
  const d = dados as { resposta?: unknown; alertas?: unknown };
  if (typeof d.resposta !== 'string' || !d.resposta.trim()) return null;
  const alertas = Array.isArray(d.alertas)
    ? d.alertas.filter(
        (a): a is RespostaAgente['alertas'][number] =>
          !!a && typeof a === 'object' && typeof a.nivel === 'string' && typeof a.motivo === 'string',
      )
    : [];
  return { resposta: d.resposta.trim(), alertas };
}

/**
 * Junta os resultados do reconhecimento de fala (Web Speech API ou nativo).
 * Resultados finais se acumulam; o parcial mais recente é usado se a escuta parar sem final.
 * O texto só é entregue uma vez, no fim da escuta, e nunca depois de um erro ou cancelamento.
 */
export function criarAcumuladorDeFala() {
  let finais: string[] = [];
  let parcial = '';
  let falhou = false;
  let entregue = false;
  return {
    resultado(transcricao: string, final: boolean): string {
      const t = transcricao.trim();
      if (final) {
        if (t) finais.push(t);
        parcial = '';
      } else {
        parcial = t;
      }
      return [...finais, parcial].filter(Boolean).join(' ');
    },
    erro(): void {
      falhou = true;
    },
    /** Chamado no fim da escuta: devolve o texto a enviar (ou null). */
    fim(): string | null {
      if (entregue || falhou) return null;
      entregue = true;
      const texto = [...finais, parcial].filter(Boolean).join(' ').trim();
      finais = [];
      parcial = '';
      return texto || null;
    },
  };
}

/** Mensagem curta para o idoso a partir do código de erro do reconhecimento (null = ficar quieta). */
export function mensagemErroEscuta(codigo: string): string | null {
  switch (codigo) {
    case 'aborted':
      return null;
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Preciso de permissão para usar o microfone. Peça ajuda para a sua família.';
    case 'no-speech':
    case 'speech-timeout':
    case 'nomatch':
      return 'Não ouvi nada. Aperte o botão e fale de novo, com calma.';
    case 'network':
      return 'Estou sem internet para entender a fala. Tente de novo daqui a pouco.';
    case 'audio-capture':
      return 'Não encontrei o microfone. Peça ajuda para a sua família.';
    case 'language-not-supported':
      return 'Este aparelho não entende português ainda. Peça ajuda para a sua família.';
    default:
      return 'Não consegui ouvir. Aperte o botão e fale de novo.';
  }
}

/** A família foi avisada na hora (vermelho: todo o círculo; laranja: o responsável principal). */
export function familiaFoiAvisada(alertas: RespostaAgente['alertas']): boolean {
  return alertas.some((a) => a.nivel === 'vermelho' || a.nivel === 'laranja');
}

/**
 * Pedido de ajuda (ferramenta pedir_ajuda / pedidoDeAjuda do motor de regras): a tela mostra
 * "Sua família foi avisada". Reconhecido pelo motivo que o motor gera.
 */
export function ehPedidoDeAjuda(alerta: RespostaAgente['alertas'][number]): boolean {
  return alerta.nivel === 'vermelho' && /^(Pediu ajuda|Apertou o botão "Preciso de ajuda")/.test(alerta.motivo);
}

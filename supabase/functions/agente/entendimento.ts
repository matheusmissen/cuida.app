// Conta quantas vezes seguidas a Lia pediu para a pessoa repetir.
// Lógica determinística sobre o texto das respostas: não depende do LLM se declarar perdido.

import { normalizar } from './sinais.ts';

const PEDIDO_DE_REPETICAO =
  /\b(pode repetir|poderia repetir|repete|repetir|nao entendi|nao consegui entender|nao ouvi|nao escutei|fala de novo|falar de novo|diga de novo|de outro jeito)\b/;

export function pediuParaRepetir(resposta: string): boolean {
  return PEDIDO_DE_REPETICAO.test(normalizar(resposta));
}

/**
 * Quantos pedidos de repetição seguidos, contando a resposta atual.
 * Olha só as falas da Lia, da mais recente para a mais antiga, e para na primeira que não foi pedido.
 */
export function contarNaoEntendeu(historico: { papel: 'idoso' | 'lia'; texto: string }[], respostaAtual: string): number {
  if (!pediuParaRepetir(respostaAtual)) return 0;
  let seguidas = 1;
  for (let i = historico.length - 1; i >= 0; i--) {
    if (historico[i].papel !== 'lia') continue;
    if (!pediuParaRepetir(historico[i].texto)) break;
    seguidas++;
  }
  return seguidas;
}

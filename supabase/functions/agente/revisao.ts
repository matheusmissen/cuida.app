// Revisão determinística da resposta da Lia antes de ela ser falada.
// Se o LLM escorregar num dos limites do CLAUDE.md, a resposta é trocada por uma frase segura.

import { normalizar } from './sinais.ts';

interface Proibicao {
  motivo: string;
  regex: RegExp;
}

const PROIBICOES: Proibicao[] = [
  {
    motivo: 'minimizou sintoma',
    regex: /\b(nao (e|eh) nada( demais| grave)?|nao precisa (se )?preocupar|e normal,? nao se preocupe|deve ser bobagem|isso passa)\b/,
  },
  {
    motivo: 'sugeriu mudar remédio',
    regex: /\b(pode (parar|suspender|aumentar|diminuir|dobrar|pular)|(pare|suspenda|aumente|diminua|dobre|pule) (o|a|os|as|de tomar|esse|essa)|tome (mais|menos|dois|duas|outro|outra)|tomar (mais|menos) (um|uma|comprimido)|toma um (paracetamol|dipirona|ibuprofeno|remedio pra))\b/,
  },
  {
    motivo: 'deu diagnóstico',
    regex: /\b((voce|a senhora|o senhor) (esta|ta) com (uma |um )?(infeccao|anemia|virose|gripe|covid|dengue|pneumonia)|(e|deve ser) (so )?(uma |um )?(virose|gripe|anemia|infeccao|pneumonia)|seu diagnostico|o diagnostico e)\b/,
  },
  {
    // Bloqueia PEDIR o dado; avisar que pedir senha é golpe continua permitido.
    motivo: 'pediu dado sensível',
    regex: /\b(me (fala|diga|diz|passa|passe|informa|informe|manda|mande|conta)|qual (e |eh )?|preciso (da|do|de)|digite|informe|confirme|repete|repita)\s+(a |o |sua |seu |aquele |aquela )*(senha|codigo|numero do cartao|dados bancarios|cvv|token|chave pix)\b/,
  },
];

export const RESPOSTA_SEGURA =
  'Obrigada por me contar. Vou avisar a sua família, e é importante falar com o seu médico sobre isso, tá bom?';

export interface Revisao {
  texto: string;
  bloqueada: boolean;
  motivos: string[];
}

export function revisarResposta(resposta: string): Revisao {
  const texto = normalizar(resposta);
  const motivos = PROIBICOES.filter((p) => p.regex.test(texto)).map((p) => p.motivo);
  if (motivos.length === 0) return { texto: resposta.trim(), bloqueada: false, motivos };
  return { texto: RESPOSTA_SEGURA, bloqueada: true, motivos };
}

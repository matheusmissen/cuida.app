// Consentimento do idoso por finalidade (docs/PRD.md, "Dados e LGPD"; tela 3 do idoso).
// Específico, destacado e por finalidade: cada uma com o seu "Concordo".
// "registro" é necessária: sem ela, a tela explica e pede de novo (decisão do dono do projeto).
import type { Paciente } from './tipos.ts';

export type Finalidade = 'registro' | 'familia' | 'lia';

export interface TextoFinalidade {
  codigo: Finalidade;
  titulo: string;
  texto: string;
}

export const FINALIDADES: TextoFinalidade[] = [
  {
    codigo: 'registro',
    titulo: 'Guardar como você está e os seus remédios',
    texto: 'Para lembrar a hora dos remédios e saber como você se sente a cada dia.',
  },
  {
    codigo: 'familia',
    titulo: 'Mostrar para a sua família',
    texto: 'As pessoas do seu grupo de cuidado veem como você está e recebem os avisos. Sem isso, só a pessoa responsável pelo seu cadastro vê.',
  },
  {
    codigo: 'lia',
    titulo: 'Conversar com a Lia',
    texto: 'A Lia é uma assistente feita com inteligência artificial. Ela conversa com você sobre como está a sua saúde.',
  },
];

export type Escolhas = Record<Finalidade, boolean>;

export const SEM_ESCOLHAS: Escolhas = { registro: false, familia: false, lia: false };

/** O que o idoso já respondeu (para "Minha privacidade" começar com as escolhas atuais). */
export function consentimentoDoPaciente(p: Pick<Paciente, 'consente_registro_em' | 'consente_familia_em' | 'consente_lia_em' | 'consentimento_respondido_em'>) {
  return {
    respondido: Boolean(p.consentimento_respondido_em),
    escolhas: {
      registro: Boolean(p.consente_registro_em),
      familia: Boolean(p.consente_familia_em),
      lia: Boolean(p.consente_lia_em),
    } satisfies Escolhas,
  };
}

/** Sem guardar os dados, o Cuida não funciona: a tela explica antes de enviar. */
export function podeContinuar(escolhas: Escolhas): boolean {
  return escolhas.registro;
}

/** O que a Lia fala (em voz) quando a tela aparece. */
export function falaDoConsentimento(apelido: string): string {
  return `${apelido}, antes de começar, eu preciso da sua permissão. Leia com calma e toque em "Concordo" no que você aceitar.`;
}

export const EXPLICACAO_REGISTRO =
  'Sem guardar essas informações, o Cuida não consegue lembrar a hora dos seus remédios nem avisar a sua família quando você precisar.';

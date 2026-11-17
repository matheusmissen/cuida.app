// Botão "Preciso de ajuda": tenta a Edge Function `pedir-ajuda` (grava o alerta e manda push);
// se ela falhar, chama direto a função do banco `pedir_ajuda()` (grava o alerta, que aparece no
// painel da família em tempo real, mas sem push). Lógica pura, com as chamadas injetadas, para testar.

export type ResultadoAjuda = 'avisada' | 'registrada' | 'falhou';

type Chamada = () => Promise<{ error: unknown }>;

async function deuCerto(chamada: Chamada): Promise<boolean> {
  try {
    const { error } = await chamada();
    return !error;
  } catch {
    return false;
  }
}

export async function pedirAjuda(chamadas: { funcao: Chamada; banco: Chamada }): Promise<ResultadoAjuda> {
  if (await deuCerto(chamadas.funcao)) return 'avisada';
  if (await deuCerto(chamadas.banco)) return 'registrada';
  return 'falhou';
}

/** O que a tela mostra e a Lia fala depois do toque. Nunca promete um aviso que não aconteceu. */
export function mensagemDaAjuda(resultado: ResultadoAjuda): { titulo: string; texto: string; fala: string } {
  switch (resultado) {
    case 'avisada':
      return {
        titulo: 'Sua família\nfoi avisada',
        texto: 'Calma, já estamos cuidando. Alguém da família vai falar com você em instantes.',
        fala: 'Sua família foi avisada. Calma, alguém vai falar com você em instantes.',
      };
    case 'registrada':
      return {
        titulo: 'Seu pedido\nfoi registrado',
        texto: 'Sua família vai ver no aplicativo. Se for urgente, ligue para o SAMU: 192.',
        fala: 'Seu pedido foi registrado e sua família vai ver no aplicativo. Se for urgente, ligue para o SAMU, um nove dois.',
      };
    case 'falhou':
      return {
        titulo: 'Não consegui\navisar agora',
        texto: 'Parece que a internet caiu. Se for urgente, ligue agora para o SAMU: 192.',
        fala: 'Não consegui avisar sua família agora. Se for urgente, ligue para o SAMU, um nove dois.',
      };
  }
}

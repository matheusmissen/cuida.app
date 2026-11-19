// "Apagar minha conta" do familiar — lógica pura, testada em Node.
// O banco devolve, para cada grupo, o nome de quem é cuidado, o papel da pessoa e se ela é a única
// do grupo (resumo_para_apagar_conta). Aqui ficam as frases da tela de confirmação.

export interface GrupoParaApagar {
  paciente_id: string;
  nome: string;
  papel: 'principal' | 'apoio' | string;
  sozinho: boolean;
}

/** Conta dos jurados (docs/demo.md): o banco recusa apagá-la (apagar_conta) e o app nem oferece. */
export const CONTA_DEMONSTRACAO = 'jurados@example.com';

export function ehContaDeDemonstracao(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase() === CONTA_DEMONSTRACAO;
}

/** Palavra que a pessoa escreve para confirmar. */
export const PALAVRA_APAGAR = 'APAGAR';

export function confirmacaoValida(texto: string): boolean {
  return texto.trim().toUpperCase() === PALAVRA_APAGAR;
}

/** O que acontece com cada grupo, em linguagem simples (uma frase por grupo). */
export function oQueAcontece(grupos: GrupoParaApagar[]): string[] {
  return grupos.map((g) => {
    if (g.sozinho) {
      return `Você é a única pessoa no grupo de ${g.nome}: os dados de ${g.nome} serão apagados (remédios, histórico, alertas, consultas e documentos) e o celular de ${g.nome} será desconectado.`;
    }
    if (g.papel === 'principal') {
      return `Você sai do grupo de ${g.nome}. A próxima pessoa do grupo vira responsável e continua recebendo os alertas.`;
    }
    return `Você sai do grupo de ${g.nome}. O grupo continua cuidando de ${g.nome}.`;
  });
}

/** Algum paciente vai ser apagado? (a tela mostra o aviso em destaque) */
export const apagaDadosDeAlguem = (grupos: GrupoParaApagar[]): boolean => grupos.some((g) => g.sozinho);

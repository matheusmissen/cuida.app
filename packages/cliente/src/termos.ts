// Termos de uso e privacidade do familiar (docs/PRD.md, "Dados e LGPD", item 2; tela 1 da família).
// Curtos e simples. Mudou o texto? Troque VERSAO_TERMOS (formato AAAA-MM-DD): todos aceitam de novo.

export const VERSAO_TERMOS = '2026-11-19';

export interface SecaoTermos {
  titulo: string;
  texto: string;
}

export const TERMOS_FAMILIA: SecaoTermos[] = [
  {
    titulo: 'Para que serve',
    texto:
      'O Cuida ajuda você a acompanhar uma pessoa idosa que mora sozinha: lembra os remédios, faz o check-in diário e avisa o grupo de cuidado quando algo sai do normal. A pessoa cuidada dá as próprias permissões no celular dela.',
  },
  {
    titulo: 'Seus dados',
    texto:
      'Guardamos o seu e-mail, o nome com que você aparece no grupo e, se você informar, o telefone. Eles servem só para você entrar, para o grupo saber quem é você e para os avisos chegarem.',
  },
  {
    titulo: 'Sigilo sobre a pessoa cuidada',
    texto:
      'Remédios, check-ins, conversas com a Lia, exames e alertas são dados de saúde e são confidenciais. Você se compromete a não compartilhar essas informações fora do grupo de cuidado, a não ser para cuidar da pessoa (por exemplo, com o médico dela).',
  },
  {
    titulo: 'O Cuida não substitui atendimento médico',
    texto:
      'A Lia não dá diagnóstico nem orienta remédios. Os avisos dependem de internet e do celular estar ligado, e podem atrasar ou não chegar. Em emergência, ligue para o SAMU (192).',
  },
  {
    titulo: 'Como cuidamos dos dados',
    texto:
      'Os dados ficam no Brasil, protegidos por regras de acesso: cada pessoa do grupo só vê o que a pessoa cuidada permitiu. Não vendemos nem compartilhamos dados de saúde com empresas. Você pode sair do grupo de cuidado quando quiser, em Ajustes.',
  },
];

/** Já aceitou a versão atual? `aceitas` são as versões que a pessoa já aceitou. */
export function precisaAceitarTermos(aceitas: string[]): boolean {
  return !aceitas.includes(VERSAO_TERMOS);
}

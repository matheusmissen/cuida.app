// Consentimento do idoso visto pela família (docs/PRD.md, "Dados e LGPD"; visual da Variação E).
// Quem decide é o idoso, no celular dele. Enquanto ele não responde, ou se recusar "mostrar para a
// família", só o responsável vê os dados; os acompanhantes não (regra ve_saude no banco).
import { consentimentoDoPaciente, FINALIDADES, type Paciente } from '@cuida/cliente';
import { Cartao, cores, fontes, IconeConfirmado, pasteis } from '@cuida/visual';
import { StyleSheet, Text, View } from 'react-native';

/** No painel: só aparece quando há algo a saber (aguardando, ou o grupo sem acesso). Na tela do grupo: a lista completa. */
export function CartaoConsentimento({
  paciente,
  papel,
  completo = false,
}: {
  paciente: Paciente;
  papel: 'principal' | 'apoio' | null;
  completo?: boolean;
}) {
  if (!paciente.usuario_id && !completo) return null; // primeiro conecta o celular
  const nome = paciente.apelido || paciente.nome;
  const { respondido, escolhas } = consentimentoDoPaciente(paciente);
  const responsavel = papel === 'principal';

  let aviso: string | null = null;
  if (!respondido) {
    aviso = responsavel
      ? `Aguardando ${nome} dar as permissões no celular. Enquanto isso, só você vê os dados; o resto do grupo não vê e a Lia não conversa sobre a saúde.`
      : `Aguardando ${nome} dar as permissões no celular. Você verá os dados quando ${nome} permitir mostrar para a família.`;
  } else if (!escolhas.familia) {
    aviso = responsavel
      ? `${nome} preferiu não mostrar os dados para o grupo. Só você vê e recebe os alertas.`
      : `${nome} preferiu não mostrar os dados para o grupo. Só o responsável vê.`;
  }
  if (!completo && !aviso) return null;

  return (
    <Cartao pastel={aviso ? 'pessego' : undefined} style={{ gap: 10 }}>
      <Text style={estilos.subtitulo}>Permissões de {nome}</Text>
      {aviso ? <Text style={estilos.texto}>{aviso}</Text> : null}
      {completo && respondido
        ? FINALIDADES.map((f) => (
            <View key={f.codigo} style={estilos.linha}>
              {escolhas[f.codigo] ? (
                <IconeConfirmado tamanho={22} cor={pasteis.menta.icone} />
              ) : (
                <Text style={estilos.nao}>✕</Text>
              )}
              <Text style={[estilos.texto, { flex: 1 }]}>
                {f.titulo}: <Text style={estilos.negrito}>{escolhas[f.codigo] ? 'concordou' : 'não concordou'}</Text>
              </Text>
            </View>
          ))
        : null}
      {completo ? <Text style={estilos.rotulo}>Só {nome} pode mudar, em "Minha privacidade", no celular.</Text> : null}
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  subtitulo: { fontFamily: fontes.titulo, fontSize: 20, color: cores.texto },
  texto: { fontFamily: fontes.texto, fontSize: 17, lineHeight: 23, color: cores.texto },
  negrito: { fontFamily: fontes.textoNegrito, fontSize: 17, color: cores.texto },
  rotulo: { fontFamily: fontes.texto, fontSize: 15, color: cores.textoSuave },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nao: { width: 22, textAlign: 'center', fontFamily: fontes.textoNegrito, fontSize: 18, color: cores.textoSuave },
});

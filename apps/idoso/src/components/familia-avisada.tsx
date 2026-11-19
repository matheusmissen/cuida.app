// "Sua família foi avisada" (visual da Variação E, docs/design.md).
// Aparece depois do botão "Preciso de ajuda" ou quando o agente registra um pedido de ajuda.
// O aparelho do idoso não lê os nomes nem os telefones do grupo (RLS), então a lista mostra o
// grupo de cuidado como um todo. Se o aviso não saiu, a tela não promete aviso e oferece o SAMU.
import { mensagemDaAjuda, type ResultadoAjuda } from '@cuida/cliente';
import {
  BotaoPrincipal,
  BotaoSecundario,
  Cartao,
  cores,
  espacos,
  fontes,
  IconeConfirmado,
  IconePessoas,
  IconeTelefone,
  pasteis,
  Quadradinho,
} from '@cuida/visual';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function TelaFamiliaAvisada({
  aoVoltar,
  resultado = 'avisada',
}: {
  aoVoltar: () => void;
  resultado?: ResultadoAjuda;
}) {
  const mensagem = mensagemDaAjuda(resultado);
  const avisada = resultado === 'avisada';
  const ligar192 = () => {
    Linking.openURL('tel:192').catch(() => {});
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}>
      <ScrollView contentContainerStyle={estilos.tela}>
        <View style={[estilos.selo, !avisada && estilos.seloAlerta]}>
          {avisada ? (
            <IconeConfirmado tamanho={46} cor={pasteis.menta.icone} />
          ) : (
            <IconeTelefone tamanho={42} cor={cores.alertaForte} />
          )}
        </View>
        <View style={{ gap: 10 }} accessibilityLiveRegion="assertive">
          <Text style={estilos.titulo} accessibilityRole="header">
            {mensagem.titulo}
          </Text>
          <Text style={estilos.texto}>{mensagem.texto}</Text>
        </View>
        {avisada && (
          <Cartao style={estilos.linha}>
            <Quadradinho pastel="amarelo" tamanho={56}>
              <IconePessoas tamanho={30} cor={pasteis.amarelo.icone} />
            </Quadradinho>
            <View style={{ flex: 1, gap: 6, alignItems: 'flex-start' }}>
              <Text style={estilos.nome}>Sua família recebeu o aviso</Text>
              <View style={estilos.selinho}>
                <Text style={estilos.selinhoTexto}>Avisada</Text>
              </View>
            </View>
          </Cartao>
        )}
        <View style={{ flexGrow: 1, minHeight: 24 }} />
        {avisada ? (
          <BotaoPrincipal rotulo="Voltar ao início" onPress={aoVoltar} />
        ) : (
          <View style={{ gap: 14 }}>
            <BotaoPrincipal
              rotulo="Ligar para o SAMU (192)"
              icone={<IconeTelefone tamanho={26} cor={cores.sobrePrimaria} />}
              onPress={ligar192}
            />
            <BotaoSecundario rotulo="Voltar ao início" onPress={aoVoltar} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: {
    flexGrow: 1,
    paddingHorizontal: espacos.lateral,
    paddingTop: 44,
    paddingBottom: 28,
    gap: 22,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  selo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: pasteis.menta.fundo,
    borderColor: pasteis.menta.borda,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seloAlerta: { backgroundColor: cores.alertaFundo, borderColor: cores.alertaBorda },
  titulo: { fontFamily: fontes.titulo, fontSize: 32, lineHeight: 38, color: cores.texto },
  texto: { fontFamily: fontes.texto, fontSize: 22, lineHeight: 31, color: cores.textoSuave },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  nome: { fontFamily: fontes.textoNegrito, fontSize: 22, lineHeight: 28, color: cores.texto },
  selinho: {
    backgroundColor: pasteis.menta.fundo,
    borderColor: pasteis.menta.borda,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  selinhoTexto: { fontFamily: fontes.textoNegrito, fontSize: 20, color: pasteis.menta.icone },
});

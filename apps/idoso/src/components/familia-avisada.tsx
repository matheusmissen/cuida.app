// "Sua família foi avisada" (referência: docs/design/telas/Idoso-Ajuda.dc.html).
// Aparece depois do botão "Preciso de ajuda" ou quando o agente registra um pedido de ajuda.
// O aparelho do idoso não lê os nomes nem os telefones do círculo (RLS), então a lista mostra o
// círculo de cuidado como um todo. Se o push não saiu, a tela não promete aviso e oferece o SAMU.
import { mensagemDaAjuda, type ResultadoAjuda } from '@cuida/cliente';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconeCheck, IconePessoas, IconeTelefone } from '@/components/icones';
import { BotaoPrincipal, BotaoSecundario, cartao, Destaque, Selo, Texto } from '@/components/ui';
import { cores, espacos, tamanhos } from '@/lib/tema';

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
            <IconeCheck tamanho={44} cor={cores.salvia.forte} traco={2.6} />
          ) : (
            <IconeTelefone tamanho={40} cor={cores.alerta.forte} traco={2.2} />
          )}
        </View>
        <View style={{ gap: 10, marginTop: 10 }} accessibilityLiveRegion="assertive">
          <Destaque tamanho={tamanhos.titulo} accessibilityRole="header">
            {mensagem.titulo}
          </Destaque>
          <Texto tamanho={22} cor={cores.textoSecundario} style={{ lineHeight: 31 }}>
            {mensagem.texto}
          </Texto>
        </View>
        {avisada && (
          <View style={[cartao, estilos.lista]}>
            <View style={estilos.linha}>
              <View style={estilos.avatar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <IconePessoas tamanho={28} cor={cores.lilas.texto} />
              </View>
              <View style={{ flex: 1 }}>
                <Texto tamanho={24} peso="negrito">
                  Sua família
                </Texto>
                <Texto tamanho={20} cor={cores.textoSuave}>
                  recebeu o aviso
                </Texto>
              </View>
              <Selo texto="Avisada" cor={cores.salvia.texto} fundo={cores.salvia.fundo} />
            </View>
          </View>
        )}
        <View style={{ flexGrow: 1, minHeight: 24 }} />
        {avisada ? (
          <BotaoPrincipal titulo="Voltar ao início" onPress={aoVoltar} />
        ) : (
          <View style={{ gap: 14 }}>
            <BotaoPrincipal
              titulo="Ligar para o SAMU (192)"
              rotulo="Ligar para o SAMU, 192"
              icone={<IconeTelefone tamanho={28} cor={cores.sobreTinta} traco={2.2} />}
              onPress={ligar192}
            />
            <BotaoSecundario titulo="Voltar ao início" onPress={aoVoltar} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: {
    flexGrow: 1,
    paddingHorizontal: espacos.margemTela,
    paddingTop: 48,
    paddingBottom: 28,
    gap: 22,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  selo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: cores.salvia.fundo,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 0 0 12px ${cores.salvia.halo}`,
    marginLeft: 12,
    marginTop: 12,
  },
  seloAlerta: { backgroundColor: cores.alerta.fundo, boxShadow: `0 0 0 12px ${cores.alerta.fundo}66` },
  lista: { paddingHorizontal: 20, paddingVertical: 8 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: cores.lilas.fundo,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

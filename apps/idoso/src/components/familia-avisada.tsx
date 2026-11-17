// "Sua família foi avisada" (referência: docs/design/telas/Idoso-Ajuda.dc.html).
// Aparece quando o agente registra um pedido de ajuda. O aparelho do idoso não lê os nomes nem
// os telefones do círculo (RLS), então a lista mostra o círculo de cuidado como um todo.
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconeCheck, IconePessoas } from '@/components/icones';
import { BotaoPrincipal, cartao, Destaque, Selo, Texto } from '@/components/ui';
import { cores, espacos, tamanhos } from '@/lib/tema';

export function TelaFamiliaAvisada({ aoVoltar }: { aoVoltar: () => void }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}>
      <ScrollView contentContainerStyle={estilos.tela}>
        <View style={estilos.check}>
          <IconeCheck tamanho={44} cor={cores.salvia.forte} traco={2.6} />
        </View>
        <View style={{ gap: 10, marginTop: 10 }}>
          <Destaque tamanho={tamanhos.titulo} accessibilityRole="header">
            {'Sua família\nfoi avisada'}
          </Destaque>
          <Texto tamanho={22} cor={cores.textoSecundario} style={{ lineHeight: 31 }}>
            Calma, já estamos cuidando. Alguém da família vai falar com você em instantes.
          </Texto>
        </View>
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
        <View style={{ flexGrow: 1, minHeight: 24 }} />
        <BotaoPrincipal titulo="Voltar ao início" onPress={aoVoltar} />
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
  check: {
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

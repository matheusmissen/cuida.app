// Termos de uso e privacidade: página aberta (dá para ler antes de criar a conta).
import { cores, espacos, fontes, IconeVoltar, tamanhos } from '@cuida/visual';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextoTermos } from '@/components/termos';

const T = tamanhos.familia;

export default function Termos() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}>
      <ScrollView contentContainerStyle={estilos.tela}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={({ pressed }) => [estilos.voltar, pressed && { opacity: 0.8 }]}
        >
          <IconeVoltar tamanho={20} cor={cores.texto} />
          <Text style={estilos.textoVoltar}>Voltar</Text>
        </Pressable>
        <Text style={estilos.titulo} accessibilityRole="header">
          Termos de uso e privacidade
        </Text>
        <TextoTermos />
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { padding: espacos.lateral, paddingTop: 24, paddingBottom: 40, gap: espacos.bloco, maxWidth: 640, width: '100%', alignSelf: 'center' },
  voltar: {
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingLeft: 12,
    paddingRight: 18,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  textoVoltar: { fontFamily: fontes.textoNegrito, fontSize: T.texto, color: cores.texto },
  titulo: { fontFamily: fontes.titulo, fontSize: T.titulo, lineHeight: T.titulo * 1.2, color: cores.texto },
});

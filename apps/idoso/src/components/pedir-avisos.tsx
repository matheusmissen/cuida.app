// Depois do código (docs/PRD.md, seção 10, tela 2 do idoso): "permite as notificações".
// Pergunta uma vez; quem disser "Agora não" ainda vê o cartão "Avisos do Cuida" no início.
import { BotaoPrincipal, BotaoSecundario, Cartao, cores, espacos, fontes, IconeSino, pasteis, Quadradinho } from '@cuida/visual';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function PedirAvisos({
  ativando,
  onAtivar,
  onDepois,
}: {
  ativando: boolean;
  onAtivar: () => void;
  onDepois: () => void;
}) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}>
      <ScrollView contentContainerStyle={estilos.miolo}>
        <View style={{ alignItems: 'center', paddingTop: 24 }}>
          <Quadradinho pastel="pessego" tamanho={88}>
            <IconeSino tamanho={44} cor={pasteis.pessego.icone} />
          </Quadradinho>
        </View>
        <Text style={estilos.titulo} accessibilityRole="header">
          Quer receber os avisos?
        </Text>
        <Cartao style={{ gap: 8 }}>
          <Text style={estilos.texto}>O Cuida avisa na hora do remédio e de manhã, para saber como você está.</Text>
          <Text style={estilos.texto}>Toque em "Sim" e depois em "Permitir".</Text>
        </Cartao>
        <BotaoPrincipal rotulo={ativando ? 'Ativando…' : 'Sim, quero os avisos'} onPress={onAtivar} desabilitado={ativando} />
        <BotaoSecundario rotulo="Agora não" onPress={onDepois} />
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  miolo: { padding: espacos.lateral, gap: espacos.bloco, maxWidth: 640, width: '100%', alignSelf: 'center' },
  titulo: { fontFamily: fontes.titulo, fontSize: 32, lineHeight: 38, color: cores.texto, textAlign: 'center' },
  texto: { fontFamily: fontes.texto, fontSize: 21, lineHeight: 29, color: cores.texto },
});

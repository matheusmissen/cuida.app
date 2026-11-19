// Contagem antes de avisar a família (depois de tocar em "Preciso de ajuda").
// Um toque sem querer não deve avisar todo o grupo: são 5 segundos com um "Cancelar" bem grande.
// Ao fim da contagem, ou em "Avisar agora", o pedido sai do mesmo jeito de antes (não depende da IA).
import { BotaoPrincipal, BotaoSecundario, cores, espacos, fontes, IconeTelefone } from '@cuida/visual';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { falar } from '@/lib/voz';

export const SEGUNDOS_PARA_AVISAR = 5;

export function TelaContagemAjuda({ onAvisar, onCancelar }: { onAvisar: () => void; onCancelar: () => void }) {
  const [restam, setRestam] = useState(SEGUNDOS_PARA_AVISAR);
  const avisou = useRef(false);

  const avisar = () => {
    if (avisou.current) return;
    avisou.current = true;
    onAvisar();
  };

  useEffect(() => {
    falar('Vou avisar a sua família. Se foi sem querer, toque em Cancelar.');
  }, []);

  useEffect(() => {
    if (restam <= 0) {
      avisar();
      return;
    }
    const id = setTimeout(() => setRestam((r) => r - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restam]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}>
      <View style={estilos.tela}>
        <View style={estilos.selo}>
          <IconeTelefone tamanho={42} cor={cores.alertaForte} />
        </View>
        <View style={{ gap: 10 }} accessibilityLiveRegion="assertive">
          <Text style={estilos.titulo} accessibilityRole="header">
            Avisando sua família
          </Text>
          <Text style={estilos.texto}>
            Em <Text style={estilos.numero}>{Math.max(restam, 0)}</Text>{' '}
            {restam === 1 ? 'segundo' : 'segundos'} toda a sua família recebe o aviso.
          </Text>
        </View>
        <View style={{ flexGrow: 1 }} />
        <View style={{ gap: 14 }}>
          <BotaoSecundario
            rotulo="Cancelar"
            tamanho="tomei"
            onPress={() => {
              avisou.current = true;
              falar('Tudo bem, não avisei ninguém.');
              onCancelar();
            }}
          />
          <BotaoPrincipal rotulo="Avisar agora" onPress={avisar} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: {
    flex: 1,
    padding: espacos.lateral,
    paddingTop: 40,
    gap: 22,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  selo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: cores.alertaFundo,
    borderWidth: 2,
    borderColor: cores.alertaBorda,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { fontFamily: fontes.titulo, fontSize: 32, lineHeight: 38, color: cores.texto },
  texto: { fontFamily: fontes.texto, fontSize: 22, lineHeight: 30, color: cores.texto },
  numero: { fontFamily: fontes.titulo, fontSize: 30, color: cores.alertaTexto },
});

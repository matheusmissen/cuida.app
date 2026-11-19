// Confirmação visual do "Tomei": um ✓ grande por 2 segundos, junto com a fala da Lia.
// Sem isso, a única confirmação era a voz (e o alarme sumindo), o que não basta para quem ouve pouco.
import { cores, fontes, IconeConfirmado, pasteis } from '@cuida/visual';
import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

export const TEMPO_ANOTADO_MS = 2000;

export function TomeiAnotado({ remedio, onFim }: { remedio: string; onFim: () => void }) {
  useEffect(() => {
    const id = setTimeout(onFim, TEMPO_ANOTADO_MS);
    return () => clearTimeout(id);
  }, [onFim]);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onFim}>
      <Pressable style={estilos.fundo} onPress={onFim} accessibilityLabel={`Anotado: ${remedio}`}>
        <View style={estilos.cartao} accessibilityLiveRegion="assertive">
          <View style={estilos.selo}>
            <IconeConfirmado tamanho={72} cor={pasteis.menta.icone} />
          </View>
          <Text style={estilos.titulo}>Anotado!</Text>
          <Text style={estilos.texto} numberOfLines={3}>
            {remedio}
          </Text>
        </View>
      </Pressable>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: 'rgba(24,24,28,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  cartao: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: cores.superficie,
    borderRadius: 28,
    borderWidth: 2.5,
    borderColor: cores.primaria,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 12,
  },
  selo: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: pasteis.menta.fundo,
    borderWidth: 2,
    borderColor: pasteis.menta.borda,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { fontFamily: fontes.titulo, fontSize: 34, lineHeight: 40, color: cores.texto },
  texto: { fontFamily: fontes.texto, fontSize: 22, lineHeight: 29, color: cores.texto, textAlign: 'center' },
});

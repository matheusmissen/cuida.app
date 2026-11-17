// Caixa de seleção (checkbox) e botão de escolha única (radio) do app da família.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cores } from '@/components/ui';
import { fontes, paleta } from '@/lib/tema';

export function Opcao({ marcada, onPress, children }: { marcada: boolean; onPress: () => void; children: string }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcada }}
      onPress={onPress}
      style={estilos.opcao}
    >
      <View style={[estilos.caixa, marcada && estilos.caixaMarcada]}>
        {marcada && <Text style={{ color: paleta.sobreTinta, fontFamily: fontes.textoNegrito }}>✓</Text>}
      </View>
      <Text style={estilos.textoOpcao}>{children}</Text>
    </Pressable>
  );
}

export function Escolha({ marcada, onPress, children }: { marcada: boolean; onPress: () => void; children: string }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: marcada }}
      onPress={onPress}
      style={[estilos.escolha, marcada && estilos.escolhaMarcada]}
    >
      <View style={[estilos.bolinha, marcada && estilos.bolinhaMarcada]}>
        {marcada && <View style={estilos.miolo} />}
      </View>
      <Text style={[estilos.textoOpcao, { flex: 0 }]}>{children}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  opcao: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  caixa: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: cores.primaria,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  caixaMarcada: { backgroundColor: cores.primaria },
  textoOpcao: { flex: 1, fontSize: 15, fontFamily: fontes.texto, color: cores.texto, lineHeight: 21 },
  escolha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: cores.borda,
  },
  escolhaMarcada: { borderColor: cores.primaria },
  bolinha: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: cores.primaria,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bolinhaMarcada: { backgroundColor: cores.primaria },
  miolo: { width: 8, height: 8, borderRadius: 4, backgroundColor: paleta.sobreTinta },
});

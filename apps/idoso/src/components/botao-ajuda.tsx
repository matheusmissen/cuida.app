// "Preciso de ajuda" (docs/PRD.md): sempre à vista, num rodapé fixo do início e do check-in. Não depende da IA.
// Visual da Variação E (docs/design.md): pílula pêssego de alerta com borda, ícone num círculo laranja forte.
import { cores, espacos, fontes, IconeTelefone } from '@cuida/visual';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

/** Rodapé fixo, fora da rolagem: o botão de ajuda nunca some da tela, mesmo em celular pequeno. */
export function RodapeAjuda({ children }: { children: ReactNode }) {
  return (
    <View style={estilos.rodape}>
      <View style={estilos.rodapeMiolo}>{children}</View>
    </View>
  );
}

export function BotaoAjuda({ enviando, onPress }: { enviando: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Preciso de ajuda. Avisa toda a sua família agora."
      accessibilityState={{ busy: enviando, disabled: enviando }}
      disabled={enviando}
      onPress={onPress}
      style={({ pressed }) => [estilos.botao, (pressed || enviando) && { opacity: 0.85 }]}
    >
      <View style={estilos.icone}>
        {enviando ? <ActivityIndicator color={cores.sobrePrimaria} /> : <IconeTelefone tamanho={26} cor={cores.sobrePrimaria} />}
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={estilos.texto}>
        {enviando ? 'Avisando sua família…' : 'Preciso de ajuda'}
      </Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  rodape: {
    backgroundColor: cores.fundo,
    borderTopWidth: 1.5,
    borderTopColor: cores.borda,
    paddingHorizontal: espacos.lateral,
    paddingVertical: 12,
  },
  rodapeMiolo: { width: '100%', maxWidth: 560, alignSelf: 'center' },
  botao: {
    minHeight: 76,
    borderRadius: 38,
    backgroundColor: cores.alertaFundo,
    borderWidth: 2,
    borderColor: cores.alertaBorda,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingLeft: 12,
    paddingRight: 24,
  },
  icone: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: cores.alertaForte,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: { flexShrink: 1, fontFamily: fontes.titulo, fontSize: 25, color: cores.alertaTexto },
});

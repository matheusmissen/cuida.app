// Peças de interface do app do idoso no visual "Manhã Clara".
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { alvos, cores, fontes, raios, sombras, tamanhoIdoso, tamanhos } from '@/lib/tema';

type Peso = 'normal' | 'negrito';

/** Texto corrido em Atkinson Hyperlegible; nunca abaixo de 20 pt. */
export function Texto({
  children,
  tamanho = tamanhos.corpo,
  peso = 'normal',
  cor = cores.tinta,
  style,
  ...resto
}: {
  children: ReactNode;
  tamanho?: number;
  peso?: Peso;
  cor?: string;
  style?: StyleProp<TextStyle>;
} & React.ComponentProps<typeof Text>) {
  const pt = tamanhoIdoso(tamanho);
  return (
    <Text
      {...resto}
      style={[
        { fontFamily: peso === 'negrito' ? fontes.textoNegrito : fontes.texto, fontSize: pt, lineHeight: Math.round(pt * 1.3), color: cor },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** Saudação, horários, nome do remédio, fala da Lia e títulos: Outfit 500. */
export function Destaque({
  children,
  tamanho = tamanhos.titulo,
  cor = cores.tinta,
  style,
  ...resto
}: {
  children: ReactNode;
  tamanho?: number;
  cor?: string;
  style?: StyleProp<TextStyle>;
} & React.ComponentProps<typeof Text>) {
  const pt = tamanhoIdoso(tamanho);
  return (
    <Text
      {...resto}
      style={[{ fontFamily: fontes.destaque, fontSize: pt, lineHeight: Math.round(pt * 1.15), color: cor, letterSpacing: pt >= 40 ? -0.01 * pt : 0 }, style]}
    >
      {children}
    </Text>
  );
}

/** Ação principal da tela: pílula preta com texto branco. */
export function BotaoPrincipal({
  titulo,
  onPress,
  icone,
  rotulo,
  desativado,
  altura = alvos.botaoPrincipalIdoso,
}: {
  titulo: string;
  onPress: () => void;
  icone?: ReactNode;
  rotulo?: string;
  desativado?: boolean;
  altura?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo ?? titulo}
      accessibilityState={{ disabled: desativado }}
      onPress={onPress}
      disabled={desativado}
      style={({ pressed }) => [
        estilos.principal,
        { height: Math.max(altura, alvos.idosoMinimo), borderRadius: altura / 2 },
        (pressed || desativado) && { opacity: 0.8 },
      ]}
    >
      {icone}
      <Text style={estilos.textoPrincipal}>{titulo}</Text>
    </Pressable>
  );
}

/** Botão secundário: caixa branca de 68, largura total, texto 22 em negrito. */
export function BotaoSecundario({
  titulo,
  onPress,
  icone,
  rotulo,
}: {
  titulo: string;
  onPress: () => void;
  icone?: ReactNode;
  rotulo?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo ?? titulo}
      onPress={onPress}
      style={({ pressed }) => [estilos.secundario, pressed && { opacity: 0.8 }]}
    >
      {icone}
      <Text style={estilos.textoSecundario}>{titulo}</Text>
    </Pressable>
  );
}

/** Barrinhas de "falando" (decorativas). */
export function Ondas({ cor, alturas = [10, 24, 16, 22, 8] }: { cor: string; alturas?: number[] }) {
  return (
    <View style={estilos.ondas} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {alturas.map((h, i) => (
        <View key={i} style={{ width: 5, height: h, borderRadius: 3, backgroundColor: cor }} />
      ))}
    </View>
  );
}

/** Pílula com texto (selos de status). */
export function Selo({ texto, cor, fundo }: { texto: string; cor: string; fundo: string }) {
  return (
    <View style={[estilos.selo, { backgroundColor: fundo }]}>
      <Texto tamanho={20} cor={cor}>
        {texto}
      </Texto>
    </View>
  );
}

export const cartao: ViewStyle = {
  backgroundColor: cores.cartao,
  borderRadius: raios.cartao,
  boxShadow: sombras.cartao,
};

const estilos = StyleSheet.create({
  principal: {
    width: '100%',
    backgroundColor: cores.tinta,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 20,
    boxShadow: sombras.botaoPrincipal,
  },
  textoPrincipal: { fontFamily: fontes.textoNegrito, fontSize: 26, color: cores.sobreTinta, textAlign: 'center' },
  secundario: {
    width: '100%',
    height: alvos.botaoSecundarioIdoso,
    borderRadius: alvos.botaoSecundarioIdoso / 2,
    backgroundColor: cores.cartao,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    boxShadow: sombras.cartao,
  },
  textoSecundario: { fontFamily: fontes.textoNegrito, fontSize: 22, color: cores.tinta },
  ondas: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 26 },
  selo: { borderRadius: raios.pilula, paddingHorizontal: 14, paddingVertical: 4, alignSelf: 'flex-start' },
});

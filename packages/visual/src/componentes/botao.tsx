// Botões em pílula. Principal: verde-petróleo com texto branco. Secundário: branco com borda verde.
// Tamanhos: 'idoso' (64 px), 'tomei' (90 px, só no "Tomei") e 'familia' (56 px).
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { alturas, bordas, cores, fontes, raios, tamanhos } from '../tema.ts';

export type TamanhoBotao = 'idoso' | 'tomei' | 'familia';

export interface BotaoProps {
  rotulo: string;
  onPress?: () => void;
  tamanho?: TamanhoBotao;
  desabilitado?: boolean;
  /** Ícone à esquerda do texto (decorativo; o rótulo já descreve o botão). */
  icone?: ReactNode;
  /** Cores para usar sobre a paisagem de noite (fundo branco, texto verde escuro). */
  sobreNoite?: boolean;
  style?: StyleProp<ViewStyle>;
}

const medidas: Record<TamanhoBotao, { altura: number; letra: number }> = {
  idoso: { altura: alturas.botaoIdoso, letra: tamanhos.idoso.botao },
  tomei: { altura: alturas.botaoTomei, letra: tamanhos.idoso.botaoTomei },
  familia: { altura: alturas.botaoFamilia, letra: tamanhos.familia.botao },
};

function BotaoBase({ rotulo, onPress, tamanho = 'idoso', desabilitado, icone, style, fundo, borda, cor }: BotaoProps & {
  fundo: string;
  borda: string;
  cor: string;
}) {
  const { altura, letra } = medidas[tamanho];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: !!desabilitado }}
      disabled={desabilitado}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.base,
        {
          minHeight: altura,
          borderRadius: raios.pilula(altura),
          backgroundColor: fundo,
          borderColor: borda,
          opacity: desabilitado ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {icone ? <View style={estilos.icone}>{icone}</View> : null}
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={tamanho === 'familia' ? 0.8 : 0.9} style={[estilos.texto, { color: cor, fontSize: letra, flexShrink: 1 }]}>
        {rotulo}
      </Text>
    </Pressable>
  );
}

export function BotaoPrincipal(props: BotaoProps) {
  return props.sobreNoite ? (
    <BotaoBase {...props} fundo={cores.superficie} borda={cores.superficie} cor={cores.primariaEscura} />
  ) : (
    <BotaoBase {...props} fundo={cores.primaria} borda={cores.primaria} cor={cores.sobrePrimaria} />
  );
}

export function BotaoSecundario(props: BotaoProps) {
  return <BotaoBase {...props} fundo={cores.superficie} borda={cores.primaria} cor={cores.primaria} />;
}

const estilos = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderWidth: bordas.botaoSecundario,
  },
  icone: { marginRight: 10 },
  texto: { fontFamily: fontes.titulo, textAlign: 'center' },
});

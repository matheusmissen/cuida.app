// Peças de interface do app da família na Variação E (docs/design.md; valores em lib/tema.ts, vindos de @cuida/visual).
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { fontes, paleta, raios, tamanhos } from '@/lib/tema';

/** Nomes curtos usados pelas telas, mapeados para os tokens. */
export const cores = {
  fundo: paleta.fundo,
  cartao: paleta.cartao,
  texto: paleta.tinta,
  secundario: paleta.textoSecundario,
  suave: paleta.textoSuave,
  borda: paleta.divisor,
  neutra: paleta.superficieNeutra,
  primaria: paleta.primaria,
  perigo: paleta.alerta.forte,
  sucesso: paleta.salvia.forte,
};

export function Tela({ children }: { children: ReactNode }) {
  return <View style={estilos.tela}>{children}</View>;
}

export function Cartao({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[estilos.cartao, style]}>{children}</View>;
}

/** Título de seção (Nunito 800, 19 px). */
export function Titulo({ children }: { children: ReactNode }) {
  return (
    <Text style={estilos.titulo} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** Título de página (Nunito 800, 27 px). */
export function TituloPagina({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <Text style={[estilos.tituloPagina, style]} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function Texto({
  children,
  suave,
  negrito,
  style,
}: {
  children: ReactNode;
  suave?: boolean;
  negrito?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      style={[
        estilos.texto,
        suave && { color: cores.secundario },
        negrito && { fontFamily: fontes.textoNegrito },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Campo({ rotulo, style, ...props }: TextInputProps & { rotulo: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <TextInput placeholderTextColor={paleta.textoSuave} style={[estilos.campo, style]} {...props} />
    </View>
  );
}

export function Botao({
  titulo,
  onPress,
  variante = 'primario',
  carregando,
  desativado,
  icone,
}: {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario' | 'perigo' | 'texto';
  carregando?: boolean;
  desativado?: boolean;
  icone?: ReactNode;
}) {
  const fundo = { primario: paleta.primaria, perigo: paleta.alerta.forte, secundario: paleta.cartao, texto: 'transparent' }[variante];
  const borda = { primario: paleta.primaria, perigo: paleta.alerta.forte, secundario: paleta.primaria, texto: 'transparent' }[variante];
  const corTexto = variante === 'primario' || variante === 'perigo' ? paleta.sobreTinta : paleta.primaria;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: carregando || desativado, busy: carregando }}
      onPress={onPress}
      disabled={carregando || desativado}
      style={({ pressed }) => [
        estilos.botao,
        { backgroundColor: fundo, borderColor: borda },
        (pressed || desativado) && { opacity: 0.7 },
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={corTexto} />
      ) : (
        <>
          {icone}
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[estilos.textoBotao, { color: corTexto, flexShrink: 1 }]}>
            {titulo}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** Selo de status em pílula (13–14 pt em negrito). */
export function Selo({ texto, cor, fundo }: { texto: string; cor: string; fundo: string }) {
  return (
    <View style={[estilos.selo, { backgroundColor: fundo }]}>
      <Text style={[estilos.textoSelo, { color: cor }]}>{texto}</Text>
    </View>
  );
}

/** Avatar redondo com inicial (pêssego para pessoas da família, lilás para a Lia). */
export function Avatar({
  nome,
  tamanho = 48,
  fundo = paleta.pessego.fundo,
  cor = paleta.pessego.texto,
}: {
  nome: string;
  tamanho?: number;
  fundo?: string;
  cor?: string;
}) {
  return (
    <View
      style={{ width: tamanho, height: tamanho, borderRadius: tamanho / 2, backgroundColor: fundo, alignItems: 'center', justifyContent: 'center' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={{ fontFamily: fontes.destaque, fontSize: Math.round(tamanho * 0.42), color: cor }}>
        {nome.trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

export function Divisor() {
  return <View style={{ height: 1, backgroundColor: cores.borda }} />;
}

export function Erro({ mensagem }: { mensagem: string | null }) {
  if (!mensagem) return null;
  return (
    <Text style={estilos.erro} accessibilityLiveRegion="polite">
      {mensagem}
    </Text>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  cartao: {
    backgroundColor: cores.cartao,
    borderRadius: raios.cartao,
    borderWidth: 1.5,
    borderColor: cores.borda,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 12,
  },
  titulo: { fontFamily: fontes.destaque, fontSize: 19, lineHeight: 24, color: cores.texto },
  tituloPagina: {
    fontFamily: fontes.destaque,
    fontSize: tamanhos.titulo,
    lineHeight: Math.round(tamanhos.titulo * 1.15),
    color: cores.texto,
  },
  texto: { fontFamily: fontes.texto, fontSize: tamanhos.corpo, color: cores.texto, lineHeight: 22 },
  rotulo: { fontFamily: fontes.textoNegrito, fontSize: 16, color: cores.texto },
  campo: {
    minHeight: 54,
    borderRadius: raios.pequeno,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: tamanhos.lista,
    fontFamily: fontes.texto,
    color: cores.texto,
    backgroundColor: cores.cartao,
    borderWidth: 1.5,
    borderColor: paleta.bordaCampo,
  },
  botao: {
    minHeight: 56,
    borderRadius: raios.pilula,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 24,
  },
  textoBotao: { fontFamily: fontes.destaque, fontSize: 18 },
  selo: { alignSelf: 'flex-start', borderRadius: raios.pilula, paddingHorizontal: 12, paddingVertical: 5 },
  textoSelo: { fontFamily: fontes.textoNegrito, fontSize: 14 },
  erro: { color: paleta.alerta.texto, fontFamily: fontes.texto, fontSize: tamanhos.corpo },
});

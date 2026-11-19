// Peças de interface do app da família no visual "Manhã Clara" (tokens em lib/tema.ts).
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
import { alvos, fontes, paleta, raios, sombras, tamanhos } from '@/lib/tema';

/** Nomes curtos usados pelas telas, mapeados para os tokens. */
export const cores = {
  fundo: paleta.fundo,
  cartao: paleta.cartao,
  texto: paleta.tinta,
  secundario: paleta.textoSecundario,
  suave: paleta.textoSuave,
  borda: paleta.divisor,
  neutra: paleta.superficieNeutra,
  primaria: paleta.tinta,
  perigo: paleta.alerta.forte,
  sucesso: paleta.salvia.forte,
};

export function Tela({ children }: { children: ReactNode }) {
  return <View style={estilos.tela}>{children}</View>;
}

export function Cartao({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[estilos.cartao, style]}>{children}</View>;
}

/** Título de seção (17 pt, negrito). */
export function Titulo({ children }: { children: ReactNode }) {
  return (
    <Text style={estilos.titulo} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** Título de página em Outfit (30 pt). */
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
  const fundo = { primario: paleta.tinta, perigo: paleta.alerta.forte, secundario: paleta.cartao, texto: 'transparent' }[variante];
  const corTexto = variante === 'primario' || variante === 'perigo' ? paleta.sobreTinta : paleta.tinta;
  const sombra = { primario: sombras.botaoPrincipal, perigo: sombras.alerta, secundario: sombras.cartao, texto: undefined }[variante];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: carregando || desativado, busy: carregando }}
      onPress={onPress}
      disabled={carregando || desativado}
      style={({ pressed }) => [
        estilos.botao,
        { backgroundColor: fundo, boxShadow: sombra },
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
    borderRadius: raios.cartaoMedio,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 12,
    boxShadow: sombras.cartao,
  },
  titulo: { fontFamily: fontes.textoNegrito, fontSize: tamanhos.secao, color: cores.texto },
  tituloPagina: {
    fontFamily: fontes.destaque,
    fontSize: tamanhos.titulo,
    lineHeight: Math.round(tamanhos.titulo * 1.1),
    letterSpacing: -0.3,
    color: cores.texto,
  },
  texto: { fontFamily: fontes.texto, fontSize: tamanhos.corpo, color: cores.texto, lineHeight: 21 },
  rotulo: { fontFamily: fontes.textoNegrito, fontSize: 14, color: cores.secundario },
  campo: {
    borderRadius: raios.pequeno,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: tamanhos.lista,
    fontFamily: fontes.texto,
    color: cores.texto,
    backgroundColor: cores.cartao,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  botao: {
    minHeight: alvos.familiaMinimo,
    borderRadius: raios.pilula,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
  },
  textoBotao: { fontFamily: fontes.textoNegrito, fontSize: tamanhos.lista },
  selo: { alignSelf: 'flex-start', borderRadius: raios.pilula, paddingHorizontal: 11, paddingVertical: 5 },
  textoSelo: { fontFamily: fontes.textoNegrito, fontSize: 14 },
  erro: { color: paleta.alerta.texto, fontFamily: fontes.texto, fontSize: tamanhos.corpo },
});

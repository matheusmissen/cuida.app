import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

export const cores = {
  fundo: '#F5F7FA',
  cartao: '#FFFFFF',
  texto: '#0F172A',
  suave: '#475569',
  borda: '#D7DEE7',
  primaria: '#0B5FFF',
  perigo: '#B00020',
  sucesso: '#11734B',
};

export function Tela({ children }: { children: ReactNode }) {
  return <View style={estilos.tela}>{children}</View>;
}

export function Cartao({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[estilos.cartao, style]}>{children}</View>;
}

export function Titulo({ children }: { children: ReactNode }) {
  return <Text style={estilos.titulo}>{children}</Text>;
}

export function Texto({ children, suave }: { children: ReactNode; suave?: boolean }) {
  return <Text style={[estilos.texto, suave && { color: cores.suave }]}>{children}</Text>;
}

export function Campo({ rotulo, ...props }: TextInputProps & { rotulo: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <TextInput placeholderTextColor="#94A3B8" style={estilos.campo} {...props} />
    </View>
  );
}

export function Botao({
  titulo,
  onPress,
  variante = 'primario',
  carregando,
  desativado,
}: {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario' | 'perigo';
  carregando?: boolean;
  desativado?: boolean;
}) {
  const primario = variante === 'primario';
  const corBorda = variante === 'perigo' ? cores.perigo : cores.primaria;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={carregando || desativado}
      style={({ pressed }) => [
        estilos.botao,
        { backgroundColor: primario ? cores.primaria : 'transparent', borderColor: corBorda },
        (pressed || desativado) && { opacity: 0.6 },
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={primario ? '#fff' : corBorda} />
      ) : (
        <Text style={[estilos.textoBotao, { color: primario ? '#fff' : corBorda }]}>{titulo}</Text>
      )}
    </Pressable>
  );
}

export function Selo({ texto, cor, fundo }: { texto: string; cor: string; fundo: string }) {
  return (
    <View style={[estilos.selo, { backgroundColor: fundo }]}>
      <Text style={[estilos.textoSelo, { color: cor }]}>{texto}</Text>
    </View>
  );
}

export function Erro({ mensagem }: { mensagem: string | null }) {
  if (!mensagem) return null;
  return <Text style={estilos.erro}>{mensagem}</Text>;
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  cartao: {
    backgroundColor: cores.cartao,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  titulo: { fontSize: 20, fontWeight: '700', color: cores.texto },
  texto: { fontSize: 16, color: cores.texto, lineHeight: 22 },
  rotulo: { fontSize: 14, fontWeight: '600', color: cores.suave },
  campo: {
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: cores.texto,
    backgroundColor: '#fff',
  },
  botao: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  textoBotao: { fontSize: 16, fontWeight: '700' },
  selo: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  textoSelo: { fontSize: 13, fontWeight: '700' },
  erro: { color: cores.perigo, fontSize: 15 },
});

// Cartão: fundo branco, borda 1,5 px e cantos de 26 px. Em destaque: borda 2,5 px verde-petróleo.
// `pastel` troca o fundo e a borda por um dos pares pastel (o texto continua escuro).
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { bordas, cores, pasteis, raios, type Pastel } from '../tema.ts';

export interface CartaoProps {
  children: ReactNode;
  destaque?: boolean;
  pastel?: Pastel;
  style?: StyleProp<ViewStyle>;
}

export function Cartao({ children, destaque, pastel, style }: CartaoProps) {
  const par = pastel ? pasteis[pastel] : null;
  return (
    <View
      style={[
        estilos.base,
        par && { backgroundColor: par.fundo, borderColor: par.borda },
        destaque && { borderColor: cores.primaria, borderWidth: bordas.destaque },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** "Quadradinho" pastel para ícones, com a borda do par. */
export function Quadradinho({ pastel, tamanho = 52, children }: { pastel: Pastel; tamanho?: number; children: ReactNode }) {
  const par = pasteis[pastel];
  return (
    <View
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: raios.quadradinho,
        borderWidth: bordas.cartao,
        backgroundColor: par.fundo,
        borderColor: par.borda,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  base: {
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderWidth: bordas.cartao,
    borderRadius: raios.cartao,
    padding: 18,
  },
});

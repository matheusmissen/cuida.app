// Rostinhos do check-in (6 níveis): blocos de 96 px, cantos de 34 px, borda de 2 px,
// olhos e boca na cor escura do nível, rótulo de 18 px em negrito embaixo.
// A cor nunca é a única informação: cada bloco tem o rótulo escrito e o nível no rótulo acessível.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { bordas, cores, fontes, NIVEIS, raios, rostinhos, rostinhoTamanho, tamanhos, type NivelRostinho } from '../tema.ts';

/** Curvatura da boca: positiva sorri, negativa fica triste. */
const CURVA: Record<NivelRostinho, number> = { 1: 14, 2: 8, 3: 0, 4: -6, 5: -11, 6: -15 };

function Rosto({ nivel, tamanho }: { nivel: NivelRostinho; tamanho: number }) {
  const cor = rostinhos[nivel].rosto;
  const curva = CURVA[nivel];
  const yBoca = curva < 0 ? 66 : 60; // boca triste fica um pouco mais baixa
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 96 96" aria-hidden accessibilityElementsHidden>
      <Circle cx="34" cy="40" r="5.5" fill={cor} />
      <Circle cx="62" cy="40" r="5.5" fill={cor} />
      {nivel === 6 ? (
        <Path d="M26 33l12-5M70 33l-12-5" stroke={cor} strokeWidth={3.5} strokeLinecap="round" />
      ) : null}
      <Path
        d={`M30 ${yBoca} Q48 ${yBoca + curva * 1.4} 66 ${yBoca}`}
        stroke={cor}
        strokeWidth={4.5}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

export interface RostinhoProps {
  nivel: NivelRostinho;
  selecionado?: boolean;
  onPress?: (nivel: NivelRostinho) => void;
  tamanho?: number;
}

export function Rostinho({ nivel, selecionado, onPress, tamanho = rostinhoTamanho }: RostinhoProps) {
  const r = rostinhos[nivel];
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${r.rotulo}, nível ${nivel} de 6`}
      accessibilityState={{ checked: !!selecionado }}
      onPress={() => onPress?.(nivel)}
      style={({ pressed }) => [estilos.item, { opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={[estilos.anel, selecionado && { borderColor: cores.primaria }]}>
        <View
          style={{
            width: tamanho,
            height: tamanho,
            borderRadius: raios.rostinho,
            borderWidth: bordas.rostinho,
            backgroundColor: r.fundo,
            borderColor: r.borda,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Rosto nivel={nivel} tamanho={tamanho - 8} />
        </View>
      </View>
      <Text style={estilos.rotulo}>{r.rotulo}</Text>
    </Pressable>
  );
}

/** Rostinho só para mostrar (painel da família): sem toque e sem rótulo; o rótulo vai no texto ao lado. */
export function SeloRostinho({ nivel, tamanho = 56 }: { nivel: NivelRostinho; tamanho?: number }) {
  const r = rostinhos[nivel];
  return (
    <View
      accessibilityLabel={`${r.rotulo}, nível ${nivel} de 6`}
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: Math.round(raios.rostinho * (tamanho / rostinhoTamanho)),
        borderWidth: bordas.rostinho,
        backgroundColor: r.fundo,
        borderColor: r.borda,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Rosto nivel={nivel} tamanho={tamanho - 6} />
    </View>
  );
}

/** Grade de 3 colunas com os 6 níveis. */
export function GradeRostinhos({ valor, aoEscolher }: { valor?: NivelRostinho | null; aoEscolher: (n: NivelRostinho) => void }) {
  return (
    <View style={estilos.grade} accessibilityRole="radiogroup" aria-label="Como você está hoje?">
      {NIVEIS.map((n) => (
        <View key={n} style={estilos.celula}>
          <Rostinho nivel={n} selecionado={valor === n} onPress={aoEscolher} />
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  item: { alignItems: 'center', gap: 6 },
  anel: { padding: 3, borderRadius: raios.rostinho + 5, borderWidth: 3, borderColor: 'transparent' },
  rotulo: {
    fontFamily: fontes.textoNegrito,
    fontSize: tamanhos.idoso.rotulo,
    color: cores.texto,
    textAlign: 'center',
  },
  grade: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  celula: { width: '33.33%', alignItems: 'center' },
});

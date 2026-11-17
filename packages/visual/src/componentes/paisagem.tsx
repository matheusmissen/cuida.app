// Paisagem ilustrada: céu em degradê, sol (dia) ou lua e estrelas (noite), dois morros e,
// no Início, uma faixa de água. Troca sozinha pela hora do aparelho (dia das 6h às 18h).
// Use `periodo` para forçar dia ou noite (por exemplo, na página de demonstração).
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { paisagem, raios } from '../tema.ts';
import { periodoDoDia, type Periodo } from '../periodo.ts';

/** Período atual, conferido a cada minuto. */
export function usePeriodo(forcado?: Periodo): Periodo {
  const [periodo, setPeriodo] = useState<Periodo>(() => forcado ?? periodoDoDia());
  useEffect(() => {
    if (forcado) {
      setPeriodo(forcado);
      return;
    }
    const id = setInterval(() => setPeriodo(periodoDoDia()), 60_000);
    return () => clearInterval(id);
  }, [forcado]);
  return periodo;
}

export interface PaisagemProps {
  /** 'cabecalho': cantos de baixo arredondados (32 px). 'cartao': todos os cantos (28 px). */
  formato?: 'cabecalho' | 'cartao';
  /** Faixa de água (só no Início). */
  agua?: boolean;
  altura?: number;
  periodo?: Periodo;
  /** Conteúdo por cima da ilustração (saudação, botão). Use as cores de `paisagem[periodo]`. */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const ESTRELAS: [number, number, number][] = [
  // Só na faixa de cima e à direita, longe do texto.
  [30, 10, 1.4], [120, 12, 1.2], [200, 9, 1.5], [268, 16, 1.2], [300, 44, 1.4], [318, 76, 1.2], [386, 84, 1.5],
];

export function Paisagem({ formato = 'cabecalho', agua, altura = 200, periodo: forcado, children, style }: PaisagemProps) {
  const periodo = usePeriodo(forcado);
  const c = paisagem[periodo];
  const raio = formato === 'cabecalho' ? raios.paisagemCabecalho : raios.paisagemCartao;
  const cantos: ViewStyle =
    formato === 'cabecalho'
      ? { borderBottomLeftRadius: raio, borderBottomRightRadius: raio }
      : { borderRadius: raio };
  const idGradiente = `ceu-${periodo}`;

  return (
    <View style={[{ height: altura, overflow: 'hidden' }, cantos, style]}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 400 200"
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFill}
        aria-hidden
        accessibilityElementsHidden
      >
        <Defs>
          <LinearGradient id={idGradiente} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.ceuTopo} />
            <Stop offset="1" stopColor={c.ceuBase} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="400" height="200" fill={`url(#${idGradiente})`} />
        {periodo === 'dia' ? (
          <>
            <Circle cx="352" cy="42" r="30" fill={c.halo} />
            <Circle cx="352" cy="42" r="19" fill={c.astro} />
          </>
        ) : (
          <>
            {ESTRELAS.map(([x, y, r]) => (
              <Circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#FFFFFF" />
            ))}
            {/* Lua crescente: meia-volta de raio 18 por fora e um arco mais aberto por dentro. */}
            <Path d="M356 24 A18 18 0 0 0 356 60 A24 24 0 0 1 356 24 Z" fill={c.astro} />
          </>
        )}
        <Path d="M0 140 Q90 92 190 128 T400 118 V200 H0 Z" fill={c.morroTras} />
        <Path d="M0 168 Q120 126 240 158 T400 150 V200 H0 Z" fill={c.morroFrente} />
        {agua ? <Rect x="0" y="182" width="400" height="18" fill={c.agua} /> : null}
      </Svg>
      {children ? <View style={estilos.conteudo}>{children}</View> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  // Margem direita maior para o texto não passar por cima do sol ou da lua.
  conteudo: { flex: 1, padding: 21, paddingRight: 72, justifyContent: 'flex-start' },
});

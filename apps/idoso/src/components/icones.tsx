// Ícones de traço do design "Manhã Clara" (mesmos caminhos SVG das telas de referência).
// Decorativos: escondidos dos leitores de tela; o rótulo fica no botão.
import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface Props {
  tamanho?: number;
  cor?: string;
  traco?: number;
}

function Base({ tamanho = 24, cor = '#18181C', traco = 2, children }: Props & { children: React.ReactNode }) {
  return (
    <Svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke={cor}
      strokeWidth={traco}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
    >
      {children}
    </Svg>
  );
}

export const IconeMicrofone = (p: Props) => (
  <Base {...p}>
    <Rect x="9" y="3" width="6" height="11" rx="3" />
    <Path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </Base>
);
export const IconeTelefone = (p: Props) => (
  <Base {...p}>
    <Path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
  </Base>
);
export const IconeSino = (p: Props) => (
  <Base {...p}>
    <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <Path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
  </Base>
);
export const IconeGota = (p: Props) => (
  <Base {...p}>
    <Path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z" />
  </Base>
);
export const IconeCheck = (p: Props) => (
  <Base {...p}>
    <Path d="m5 12 5 5L20 7" />
  </Base>
);
export const IconeAltoFalante = (p: Props) => (
  <Base {...p}>
    <Path d="M4 9v6h4l5 4V5L8 9H4Z" />
    <Path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
  </Base>
);
export const IconeParar = (p: Props) => (
  <Base {...p}>
    <Rect x="6" y="6" width="12" height="12" rx="2" />
  </Base>
);
export const IconePessoas = (p: Props) => (
  <Base {...p}>
    <Circle cx="9" cy="8" r="3.5" />
    <Path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" />
  </Base>
);

// Ícones do app do idoso que não estão em @cuida/visual (microfone, parar, alto-falante), com o mesmo traço.
// Decorativos: escondidos dos leitores de tela; o rótulo fica no botão.
import Svg, { Path, Rect } from 'react-native-svg';

interface Props {
  tamanho?: number;
  cor?: string;
  traco?: number;
}

function Base({ tamanho = 24, cor = '#1C2321', traco = 2.1, children }: Props & { children: React.ReactNode }) {
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

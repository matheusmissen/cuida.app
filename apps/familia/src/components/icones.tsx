// Ícones de traço do design "Manhã Clara" (mesmos caminhos SVG das telas de referência).
// Iguais aos do app do idoso, mais os da navegação da família.
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

export const IconeCasa = (p: Props) => (
  <Base {...p}>
    <Path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3Z" />
  </Base>
);
export const IconePilula = (p: Props) => (
  <Base {...p}>
    <Path d="M10.5 20.5 3.5 13.5a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7Z" />
    <Path d="m8.5 8.5 7 7" />
  </Base>
);
export const IconeAjustes = (p: Props) => (
  <Base {...p}>
    <Path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
    <Circle cx="16" cy="7" r="2" />
    <Circle cx="8" cy="17" r="2" />
  </Base>
);
export const IconeSetaDireita = (p: Props) => (
  <Base {...p}>
    <Path d="m9 6 6 6-6 6" />
  </Base>
);
export const IconeSetaEsquerda = (p: Props) => (
  <Base {...p}>
    <Path d="m15 6-6 6 6 6" />
  </Base>
);
export const IconeDocumento = (p: Props) => (
  <Base {...p}>
    <Path d="M7 3h7l4 4v14H7Z" />
    <Path d="M14 3v4h4M10 12h5M10 16h5" />
  </Base>
);
export const IconeMais = (p: Props) => (
  <Base {...p}>
    <Path d="M12 5v14M5 12h14" />
  </Base>
);
export const IconeCamera = (p: Props) => (
  <Base {...p}>
    <Path d="M4 8h3l2-3h6l2 3h3v11H4Z" />
    <Circle cx="12" cy="13" r="3.5" />
  </Base>
);
export const IconeEnviar = (p: Props) => (
  <Base {...p}>
    <Path d="M12 15V3M7 8l5-5 5 5" />
    <Path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
  </Base>
);
export const IconeLapis = (p: Props) => (
  <Base {...p}>
    <Path d="M4 20h4L19 9l-4-4L4 16Z" />
  </Base>
);
export const IconeRelogio = (p: Props) => (
  <Base {...p}>
    <Circle cx="12" cy="12" r="9" />
    <Path d="M12 7v5l3 2" />
  </Base>
);
export const IconeFrasco = (p: Props) => (
  <Base {...p}>
    <Path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" />
    <Path d="M7.5 15h9" />
  </Base>
);
export const IconeLeitura = (p: Props) => (
  <Base {...p}>
    <Path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
    <Path d="M8 10h8M8 14h5" />
  </Base>
);

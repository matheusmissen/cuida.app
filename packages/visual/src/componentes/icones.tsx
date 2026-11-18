// Ícones de traço (2,1 px, cantos arredondados) da Variação E. Decorativos: o rótulo fica no botão.
import type { ReactNode } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { cores, tracoIcone } from '../tema.ts';

export interface IconeProps {
  tamanho?: number;
  cor?: string;
}

function Base({ tamanho = 24, cor = cores.texto, children }: IconeProps & { children: ReactNode }) {
  return (
    <Svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke={cor}
      strokeWidth={tracoIcone}
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

export const IconeCasa = (p: IconeProps) => (
  <Base {...p}>
    <Path d="M3 11l9-7 9 7" />
    <Path d="M5 10v10h14V10" />
    <Path d="M10 20v-6h4v6" />
  </Base>
);

export const IconePilula = (p: IconeProps) => (
  <Base {...p}>
    <Rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-35 12 12)" />
    <Path d="M9.2 7.9l5.6 8.2" />
  </Base>
);

export const IconeCalendario = (p: IconeProps) => (
  <Base {...p}>
    <Rect x="3.5" y="5" width="17" height="15" rx="3" />
    <Path d="M3.5 10h17M8 3v4M16 3v4" />
  </Base>
);

export const IconePessoas = (p: IconeProps) => (
  <Base {...p}>
    <Circle cx="9" cy="8" r="3.2" />
    <Path d="M3 19c.6-3.4 3-5 6-5s5.4 1.6 6 5" />
    <Circle cx="17" cy="9" r="2.5" />
    <Path d="M16.5 14.2c2.4.2 4 1.7 4.5 4.3" />
  </Base>
);

export const IconeConversa = (p: IconeProps) => (
  <Base {...p}>
    <Path d="M4 5h16v11H9l-5 4V5z" />
  </Base>
);

export const IconeTelefone = (p: IconeProps) => (
  <Base {...p}>
    <Path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
  </Base>
);

export const IconeSino = (p: IconeProps) => (
  <Base {...p}>
    <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <Path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
  </Base>
);

export const IconeConfirmado = (p: IconeProps) => (
  <Base {...p}>
    <Path d="M5 12.5l4.5 4.5L19 7.5" />
  </Base>
);

export const IconeVoltar = (p: IconeProps) => (
  <Base {...p}>
    <Path d="M15 5l-7 7 7 7" />
  </Base>
);

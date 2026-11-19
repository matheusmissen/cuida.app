// Desenho do remédio na hora do remédio, quando não há foto da caixa: o formato e a cor do comprimido.
// Decorativo: a descrição ("Comprimido redondo branco") vai sempre escrita ao lado.
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { cores } from '../tema.ts';

export type FormatoDesenho = 'redondo' | 'oval' | 'capsula' | 'gotas' | 'liquido' | 'outro';

const CONTORNO = cores.texto;
const SEGUNDA_COR = '#F6D35B';

export function DesenhoComprimido({
  formato,
  cor = '#FFFFFF',
  duasCores = false,
  tamanho = 96,
}: {
  formato?: FormatoDesenho | string | null;
  /** Cor do comprimido (hex). */
  cor?: string;
  /** Comprimido "de duas cores": a segunda metade fica amarela. */
  duasCores?: boolean;
  tamanho?: number;
}) {
  const metade = duasCores ? SEGUNDA_COR : cor;
  const traco = { stroke: CONTORNO, strokeWidth: 3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  let desenho;
  switch (formato) {
    case 'redondo':
      desenho = (
        <G>
          <Circle cx="48" cy="48" r="30" fill={cor} {...traco} />
          <Circle cx="48" cy="48" r="22" fill="none" stroke={CONTORNO} strokeOpacity={0.15} strokeWidth={2} />
          <Path d="M40 48h16" stroke={CONTORNO} strokeOpacity={0.35} strokeWidth={2} strokeLinecap="round" />
        </G>
      );
      break;
    case 'oval':
      desenho = (
        <G>
          <Rect x="14" y="31" width="68" height="34" rx="17" fill={cor} {...traco} />
          <Path d="M48 39v18" stroke={CONTORNO} strokeOpacity={0.35} strokeWidth={2} strokeLinecap="round" />
        </G>
      );
      break;
    case 'capsula':
      desenho = (
        <G transform="rotate(-30 48 48)">
          <Path d="M48 31H31a17 17 0 0 0 0 34h17z" fill={cor} {...traco} />
          <Path d="M48 31h17a17 17 0 0 1 0 34H48z" fill={metade} {...traco} />
        </G>
      );
      break;
    case 'gotas':
      desenho = <Path d="M48 16c12 16 22 28 22 40a22 22 0 0 1-44 0c0-12 10-24 22-40z" fill="#CFE3F7" {...traco} />;
      break;
    case 'liquido':
      desenho = (
        <G>
          <Rect x="38" y="14" width="20" height="12" rx="3" fill="#DDD5C8" {...traco} />
          <Rect x="28" y="26" width="40" height="56" rx="10" fill="#F3E1C7" {...traco} />
          <Path d="M28 50h40" {...traco} />
        </G>
      );
      break;
    default:
      desenho = (
        <G transform="rotate(-30 48 48)">
          <Rect x="14" y="31" width="68" height="34" rx="17" fill={cor} {...traco} />
          <Path d="M48 31v34" {...traco} />
        </G>
      );
  }
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 96 96" aria-hidden accessibilityElementsHidden>
      {desenho}
    </Svg>
  );
}

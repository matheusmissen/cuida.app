// Dia ou noite pela hora local do aparelho (docs/design.md, "Paisagem dia / noite").
// Dia das 6h às 18h; noite das 18h às 6h.

export type Periodo = 'dia' | 'noite';

export function periodoDoDia(agora: Date = new Date()): Periodo {
  const h = agora.getHours();
  return h >= 6 && h < 18 ? 'dia' : 'noite';
}

/** "Bom dia" das 5h ao meio-dia, "Boa tarde" até as 18h, "Boa noite" no resto. */
export function saudacao(agora: Date = new Date()): string {
  const h = agora.getHours();
  if (h >= 5 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Os 3 níveis mais baixos do check-in chamam a Lia (docs/PRD.md, seção 4). */
export const chamaLia = (nivel: number): boolean => nivel >= 4;

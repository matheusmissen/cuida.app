// Na web não há alarme do sistema: o alarme aparece como modal na própria página.
import type { DoseComRemedio } from '@cuida/cliente';

export async function agendarAlarmes(_doses: DoseComRemedio[]): Promise<void> {}

/** Na web, a Lia chama para o check-in na própria página. */
export async function agendarCheckin(_instantes: Date[]): Promise<void> {}

/** Na web, o alarme adiado volta na própria página (com o Cuida aberto). */
export async function agendarAdiado(_dose: DoseComRemedio, _quando: Date): Promise<void> {}

// Regra de silêncio: nenhuma interação com o app em 24 h → alerta vermelho.
// A decisão é do motor de regras (avaliarSilencio); aqui só se evita repetir o aviso.

import { avaliarSilencio, type Alerta } from '../../../packages/regras/src/index.ts';

export interface PacienteInteracao {
  id: string;
  ultimaInteracaoEm: string | null;
}

export interface SilencioDetectado {
  pacienteId: string;
  alerta: Alerta;
}

/**
 * Pacientes em silêncio que ainda não receberam alerta de silêncio desde a última interação.
 * @param ultimoAlertaSilencio paciente_id → criado_em do alerta 'geral.silencio_24h' mais recente
 */
export function pacientesEmSilencio(
  pacientes: PacienteInteracao[],
  ultimoAlertaSilencio: Map<string, string>,
  agora: Date,
): SilencioDetectado[] {
  const resultado: SilencioDetectado[] = [];
  for (const p of pacientes) {
    if (!p.ultimaInteracaoEm) continue; // aparelho ainda não usado: não há o que medir
    const alerta = avaliarSilencio(p.ultimaInteracaoEm, agora);
    if (!alerta) continue;
    const jaAvisado = ultimoAlertaSilencio.get(p.id);
    if (jaAvisado && Date.parse(jaAvisado) >= Date.parse(p.ultimaInteracaoEm)) continue;
    resultado.push({ pacienteId: p.id, alerta });
  }
  return resultado;
}

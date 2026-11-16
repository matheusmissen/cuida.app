// Mensagens para a API de push da Expo (https://exp.host/--/api/v2/push/send).

import type { Nivel } from '../regras/index.ts';

export interface MensagemPush {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  priority: 'high' | 'default';
  channelId: string;
  data: Record<string, string>;
}

const TITULO: Record<Nivel, string> = {
  vermelho: 'Urgente',
  laranja: 'Atenção',
  amarelo: 'Para acompanhar',
  informativo: 'Aviso',
};

export function montarMensagens(
  tokens: string[],
  alerta: { id: string; nivel: Nivel; motivo: string },
  nomePaciente: string,
): MensagemPush[] {
  const validos = [...new Set(tokens.filter((t) => /^Expo(nent)?PushToken\[.+\]$/.test(t)))];
  return validos.map((to) => ({
    to,
    title: `${TITULO[alerta.nivel]}: ${nomePaciente}`,
    body: alerta.motivo,
    sound: 'default',
    priority: alerta.nivel === 'vermelho' || alerta.nivel === 'laranja' ? 'high' : 'default',
    channelId: alerta.nivel === 'vermelho' ? 'alertas-urgentes' : 'alertas',
    data: { alertaId: alerta.id, nivel: alerta.nivel },
  }));
}

/** Lembrete para o aparelho do idoso (alarme repetido de dose). */
export function mensagemRealarme(token: string, nomeRemedio: string, dose: string): MensagemPush {
  return {
    to: token,
    title: 'Hora do remédio',
    body: `${nomeRemedio}: ${dose}. Toque em "Tomei" quando tomar.`,
    sound: 'default',
    priority: 'high',
    channelId: 'alarme-remedio',
    data: { tipo: 'realarme' },
  };
}

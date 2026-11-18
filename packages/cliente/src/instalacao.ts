// Instalar o Cuida e primeiro acesso do idoso (docs/PRD.md, seção 3; seção 10, telas 1 e 2 do idoso).
// Lógica pura (recebe o userAgent), testada em Node.

export type Sistema = 'ios' | 'android' | 'outro';

export interface Navegador {
  sistema: Sistema;
  /** Link aberto dentro de um app de mensagens/rede social (WhatsApp, Instagram, Facebook...), que não instala apps. */
  dentroDeApp: boolean;
  /** Nome do app de mensagens, se der para saber (para a frase "abriu dentro do WhatsApp"). */
  nomeDoApp: string | null;
}

const APPS: [RegExp, string][] = [
  [/WhatsApp/i, 'WhatsApp'],
  [/Instagram/i, 'Instagram'],
  [/FBAN|FBAV|FB_IAB|FBIOS/i, 'Facebook'],
  [/Messenger/i, 'Messenger'],
  [/Telegram/i, 'Telegram'],
  [/\bLine\//i, 'Line'],
  [/TikTok|musical_ly|BytedanceWebview/i, 'TikTok'],
];

export function reconhecerNavegador(userAgent: string, toquesMaximos = 0): Navegador {
  const ios = /iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && toquesMaximos > 1);
  const android = /Android/i.test(userAgent);
  const app = APPS.find(([re]) => re.test(userAgent));
  // Android: navegador embutido de apps costuma marcar "; wv)".
  const webviewAndroid = android && /;\s?wv\)/.test(userAgent);
  return {
    sistema: ios ? 'ios' : android ? 'android' : 'outro',
    dentroDeApp: Boolean(app) || webviewAndroid,
    nomeDoApp: app?.[1] ?? null,
  };
}

/**
 * A tela "Instalar o Cuida" aparece antes do primeiro acesso no celular (iPhone ou Android) que ainda
 * não abriu o Cuida pelo ícone. No computador (por exemplo, os jurados) não aparece.
 */
export function precisaInstalar(n: Navegador, instalado: boolean, dispensou: boolean): boolean {
  if (instalado || dispensou) return false;
  return n.sistema !== 'outro' || n.dentroDeApp;
}

/** "4 8 2-1", "4821" → "4821". Null se não são 4 números. */
export function lerCodigoDeAcesso(texto: string): string | null {
  const digitos = texto.replace(/\D/g, '');
  return /^\d{4}$/.test(digitos) ? digitos : null;
}

export const LINK_DO_APP_DO_IDOSO = 'https://cuida-app-idoso.vercel.app/';

/** Mensagem que a família manda por WhatsApp ou SMS com o link de instalação. */
export function mensagemDeInstalacao(apelido: string, link = LINK_DO_APP_DO_IDOSO): string {
  return (
    `Oi, ${apelido}! Instale o Cuida no seu celular: ${link} . ` +
    'No iPhone, abra no Safari; no Android, abra no Chrome. Depois eu te passo um código de 4 números.'
  );
}

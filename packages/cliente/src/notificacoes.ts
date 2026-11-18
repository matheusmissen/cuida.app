// Notificações no navegador (web push), docs/PRD.md seções 3, 5 e 9.
// Sem React Native: recebe o navegador por parâmetro para ser testado em Node.
//
// iPhone: as notificações só existem com o Cuida instalado na Tela de Início (iOS 16.4 ou mais novo),
// e a permissão só pode ser pedida a partir de um toque da pessoa num botão.

/**
 * Chave pública VAPID do servidor (pode ficar no código: é pública).
 * A privada fica só nos segredos do Supabase (VAPID_PRIVATE_KEY). Trocar uma exige trocar a outra.
 */
export const CHAVE_PUBLICA_VAPID =
  'BHEed36FTbL5x4wSJvv2rJs6HMGPtc7LzFEDG4rszdb1IcbxQ2EbpuR4Nz3NuQ_fPOscQrVrEqKv2XLtzKUlBfM';

export type EstadoNotificacoes =
  /** Navegador sem web push (ou app nativo, que usa outro caminho). */
  | 'sem_suporte'
  /** iPhone com o Cuida aberto no Safari: precisa adicionar à Tela de Início primeiro. */
  | 'instalar_primeiro'
  /** Dá para ativar com um toque. */
  | 'pedir'
  /** A pessoa recusou; só nos ajustes do celular/navegador. */
  | 'bloqueadas'
  | 'ativas';

export interface SituacaoNotificacoes {
  temPush: boolean;
  permissao: 'default' | 'granted' | 'denied';
  iphone: boolean;
  instalado: boolean;
  inscrito: boolean;
}

export function estadoNotificacoes(s: SituacaoNotificacoes): EstadoNotificacoes {
  if (s.iphone && !s.instalado) return 'instalar_primeiro';
  if (!s.temPush) return 'sem_suporte';
  if (s.permissao === 'denied') return 'bloqueadas';
  if (s.permissao === 'granted' && s.inscrito) return 'ativas';
  return 'pedir';
}

/** iPhone ou iPad (o iPad recente se apresenta como Mac, mas tem tela de toque). */
export function ehIphone(userAgent: string, toquesMaximos = 0): boolean {
  return /iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && toquesMaximos > 1);
}

/** Chave base64url → bytes (formato que o pushManager.subscribe aceita). */
export function chaveParaBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const b64 = base64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base64url.length / 4) * 4, '=');
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

export interface DadosInscricao {
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface AssinaturaPush {
  toJSON(): { endpoint?: string; keys?: Record<string, string> };
}

/** Dados que o servidor precisa para mandar a notificação (tabela inscricoes_push). */
export function dadosDaInscricao(assinatura: AssinaturaPush): DadosInscricao {
  const j = assinatura.toJSON();
  if (!j.endpoint || !j.keys?.p256dh || !j.keys?.auth) throw new Error('Inscrição sem endpoint ou chaves');
  return { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth };
}

/** O pedaço do navegador que usamos (window.Notification e o registro do service worker). */
export interface NavegadorNotificacoes {
  permissao: () => SituacaoNotificacoes['permissao'];
  pedirPermissao: () => Promise<SituacaoNotificacoes['permissao']>;
  /** Registro do service worker, ou null se não houver (por exemplo, em desenvolvimento). */
  registro: () => Promise<{
    pushManager: {
      getSubscription(): Promise<AssinaturaPush | null>;
      subscribe(opcoes: { userVisibleOnly: true; applicationServerKey: Uint8Array<ArrayBuffer> }): Promise<AssinaturaPush>;
    };
  } | null>;
}

/** Situação atual, sem pedir nada à pessoa. */
export async function lerSituacao(
  nav: NavegadorNotificacoes | null,
  iphone: boolean,
  instalado: boolean,
): Promise<EstadoNotificacoes> {
  if (!nav) return estadoNotificacoes({ temPush: false, permissao: 'default', iphone, instalado, inscrito: false });
  const registro = await nav.registro().catch(() => null);
  const inscrito = Boolean(registro && (await registro.pushManager.getSubscription().catch(() => null)));
  return estadoNotificacoes({ temPush: Boolean(registro), permissao: nav.permissao(), iphone, instalado, inscrito });
}

/**
 * Ativa as notificações: pede a permissão (chame direto no toque do botão), inscreve o navegador
 * e salva a inscrição no servidor. Devolve o novo estado.
 */
export async function ativarNotificacoes(
  nav: NavegadorNotificacoes,
  salvar: (dados: DadosInscricao) => Promise<void>,
  chavePublica = CHAVE_PUBLICA_VAPID,
): Promise<EstadoNotificacoes> {
  const permissao = await nav.pedirPermissao();
  if (permissao === 'denied') return 'bloqueadas';
  if (permissao !== 'granted') return 'pedir';
  const registro = await nav.registro();
  if (!registro) return 'sem_suporte';
  const assinatura =
    (await registro.pushManager.getSubscription()) ??
    (await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(chavePublica) }));
  await salvar(dadosDaInscricao(assinatura));
  return 'ativas';
}

/** Texto curto para cada situação. */
export function textoDasNotificacoes(estado: EstadoNotificacoes, app: 'idoso' | 'familia'): string {
  const o_que = app === 'idoso' ? 'os avisos do remédio e do check-in' : 'os alertas';
  switch (estado) {
    case 'ativas':
      return `Notificações ligadas neste celular. Você vai receber ${o_que}.`;
    case 'pedir':
      return `Ative as notificações para receber ${o_que}, mesmo com o app fechado.`;
    case 'bloqueadas':
      return 'As notificações estão bloqueadas. Para liberar, abra os ajustes do celular, procure o Cuida e permita as notificações.';
    case 'instalar_primeiro':
      return `No iPhone, as notificações só funcionam com o Cuida na Tela de Início: no Safari, toque em Compartilhar e depois em "Adicionar à Tela de Início". Depois abra o Cuida pelo ícone.`;
    default:
      return 'Este navegador não recebe notificações. Use o Chrome (Android) ou o Safari (iPhone), com o app instalado.';
  }
}

/** O navegador de verdade (window.Notification + service worker), ou null se não tiver web push. */
export function navegadorDoBrowser(): NavegadorNotificacoes | null {
  // deno-lint-ignore no-explicit-any
  const g = globalThis as any;
  if (!g.Notification || !g.navigator?.serviceWorker || !g.PushManager) return null;
  return {
    permissao: () => g.Notification.permission,
    pedirPermissao: () => g.Notification.requestPermission(),
    registro: async () => {
      const registro = await g.navigator.serviceWorker.getRegistration('/');
      if (!registro) return null; // sem service worker (por exemplo, em desenvolvimento)
      if (registro.active) return registro;
      // Acabou de instalar: espera ficar ativo (até 10 s).
      return Promise.race([g.navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 10_000))]);
    },
  };
}

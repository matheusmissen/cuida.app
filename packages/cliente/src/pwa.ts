// PWA no navegador (docs/PRD.md, seção 9): registro do service worker e "está instalado?".
// Sem React Native: recebe o `navigator`/`window` por parâmetro para ser testado em Node.

export interface NavegadorPwa {
  serviceWorker?: { register: (url: string, opcoes?: { scope?: string }) => Promise<unknown> };
  /** Safari do iPhone: true quando aberto pelo ícone da Tela de Início. */
  standalone?: boolean;
}

export interface JanelaPwa {
  matchMedia?: (consulta: string) => { matches: boolean };
}

/**
 * Registra /sw.js. Só em produção (no servidor de desenvolvimento o cache atrapalharia)
 * e só se o navegador tiver service worker. Nunca lança erro: sem service worker o app funciona igual.
 * @returns true se pediu o registro
 */
export function registrarServiceWorker(
  navegador: NavegadorPwa | undefined,
  producao: boolean,
  aoFalhar: (erro: unknown) => void = () => {},
): boolean {
  if (!producao || !navegador?.serviceWorker) return false;
  navegador.serviceWorker.register('/sw.js', { scope: '/' }).catch(aoFalhar);
  return true;
}

/**
 * O app foi aberto pelo ícone da tela inicial (instalado)? No iPhone isso decide se as
 * notificações funcionam e se o login vale (docs/PRD.md, seção 3).
 */
export function estaInstalado(janela: JanelaPwa | undefined, navegador: NavegadorPwa | undefined): boolean {
  if (navegador?.standalone === true) return true;
  return ['(display-mode: standalone)', '(display-mode: fullscreen)'].some(
    (c) => janela?.matchMedia?.(c).matches === true,
  );
}

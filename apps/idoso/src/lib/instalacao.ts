// Instalar o Cuida na tela inicial (docs/PRD.md, seção 3). A lógica pura fica em @cuida/cliente (instalacao.ts).
// No Android (Chrome), o navegador avisa que dá para instalar com o evento `beforeinstallprompt`:
// guardamos o evento para o botão "Instalar o Cuida". No iPhone não existe botão: a pessoa segue o passo a passo.
import { estaInstalado, precisaInstalar, reconhecerNavegador, type Navegador } from '@cuida/cliente';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

interface PedidoDeInstalacao {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const CHAVE_DISPENSOU = 'cuida.instalacao_dispensada';
let pedido: PedidoDeInstalacao | null = null;
let instaladoAgora = false;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

/** Chame cedo (no _layout): o evento do Chrome chega logo que a página abre. */
export function ouvirInstalacao(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // nós mostramos o botão, com texto grande
    pedido = e as unknown as PedidoDeInstalacao;
    avisar();
  });
  window.addEventListener('appinstalled', () => {
    instaladoAgora = true;
    pedido = null;
    avisar();
  });
}

export interface EstadoInstalacao {
  navegador: Navegador;
  /** Aberto pelo ícone da tela inicial. */
  instalado: boolean;
  /** Acabou de instalar pelo botão (falta abrir pelo ícone). */
  acabouDeInstalar: boolean;
  /** Mostrar a tela "Instalar o Cuida" antes do primeiro acesso. */
  mostrarTela: boolean;
  /** O Chrome deixou instalar com um toque. */
  temBotao: boolean;
  instalar: () => Promise<void>;
  /** "Continuar sem instalar". */
  dispensar: () => void;
  /** Ainda lendo se a pessoa já tinha dispensado. */
  carregando: boolean;
}

export function useInstalacao(): EstadoInstalacao {
  const g = globalThis as unknown as { navigator?: Navigator; matchMedia?: (c: string) => MediaQueryList };
  const navegador = reconhecerNavegador(g.navigator?.userAgent ?? '', g.navigator?.maxTouchPoints ?? 0);
  const instalado = Platform.OS !== 'web' || estaInstalado(g, g.navigator as never);
  const [, atualizar] = useState(0);
  const [dispensou, setDispensou] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const f = () => atualizar((n) => n + 1);
    ouvintes.add(f);
    AsyncStorage.getItem(CHAVE_DISPENSOU)
      .then((v) => setDispensou(v === 'sim'))
      .catch(() => {})
      .finally(() => setCarregando(false));
    return () => {
      ouvintes.delete(f);
    };
  }, []);

  const instalar = useCallback(async () => {
    if (!pedido) return;
    const atual = pedido;
    await atual.prompt();
    const { outcome } = await atual.userChoice;
    if (outcome === 'accepted') {
      instaladoAgora = true;
      pedido = null;
    }
    avisar();
  }, []);

  const dispensar = useCallback(() => {
    setDispensou(true);
    AsyncStorage.setItem(CHAVE_DISPENSOU, 'sim').catch(() => {});
  }, []);

  return {
    navegador,
    instalado,
    acabouDeInstalar: instaladoAgora,
    mostrarTela: Platform.OS === 'web' && precisaInstalar(navegador, instalado, dispensou),
    temBotao: Boolean(pedido) && !navegador.dentroDeApp,
    instalar,
    dispensar,
    carregando,
  };
}

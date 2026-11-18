import { AtkinsonHyperlegible_400Regular } from '@expo-google-fonts/atkinson-hyperlegible/400Regular';
import { AtkinsonHyperlegible_700Bold } from '@expo-google-fonts/atkinson-hyperlegible/700Bold';
import { Outfit_500Medium } from '@expo-google-fonts/outfit/500Medium';
import { fontesVariacaoE } from '@cuida/visual';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { registrarServiceWorker } from '@cuida/cliente';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { AparelhoProvider } from '@/lib/aparelho';
import { ouvirInstalacao } from '@/lib/instalacao';
import { cores } from '@/lib/tema';

SplashScreen.preventAutoHideAsync().catch(() => {});
// O Chrome avisa cedo que dá para instalar (botão "Instalar o Cuida"): começa a ouvir já.
ouvirInstalacao();

// Uma tela só, sem menus e sem gestos de deslizar: tudo é configurado pelo app da família.
export default function Layout() {
  // Fontes do design "Manhã Clara". Se falharem, o app segue com a fonte do sistema.
  // Também carrega as fontes da Variação E (Nunito e Atkinson), usadas pelos componentes de @cuida/visual.
  const [carregadas, erro] = useFonts({
    ...fontesVariacaoE,
    AtkinsonHyperlegible_400Regular,
    AtkinsonHyperlegible_700Bold,
    Outfit_500Medium,
  });
  const pronto = carregadas || Boolean(erro);

  // PWA: no navegador, registra o service worker (instalável na tela inicial e abre sem internet).
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    registrarServiceWorker(globalThis.navigator, process.env.NODE_ENV === 'production', (e) =>
      console.warn('Service worker:', e instanceof Error ? e.message : e),
    );
  }, []);

  useEffect(() => {
    if (pronto) SplashScreen.hideAsync().catch(() => {});
  }, [pronto]);

  if (!pronto) return null;
  return (
    <AparelhoProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
          animation: 'none',
          contentStyle: { backgroundColor: cores.fundo },
        }}
      />
    </AparelhoProvider>
  );
}

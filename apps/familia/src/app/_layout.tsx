import { AtkinsonHyperlegible_400Regular } from '@expo-google-fonts/atkinson-hyperlegible/400Regular';
import { AtkinsonHyperlegible_700Bold } from '@expo-google-fonts/atkinson-hyperlegible/700Bold';
import { Outfit_500Medium } from '@expo-google-fonts/outfit/500Medium';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { cores } from '@/components/ui';
import { fontes } from '@/lib/tema';
import { PacienteProvider } from '@/lib/paciente';
import { registrarPush } from '@/lib/push';
import { SessaoProvider, useSessao } from '@/lib/sessao';

function Rotas() {
  const { sessao, carregando } = useSessao();

  useEffect(() => {
    if (sessao) registrarPush(sessao.user.id).catch((e) => console.warn('Push:', e?.message ?? e));
  }, [sessao]);

  if (carregando) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.fundo }}>
        <ActivityIndicator size="large" color={cores.primaria} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerTitleStyle: { fontFamily: fontes.destaque, fontSize: 20, color: cores.texto },
        headerBackTitle: 'Voltar',
        headerStyle: { backgroundColor: cores.fundo },
        headerShadowVisible: false,
        headerTintColor: cores.texto,
        contentStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Stack.Protected guard={!sessao}>
        <Stack.Screen name="entrar" options={{ headerShown: false, title: 'Entrar' }} />
      </Stack.Protected>
      <Stack.Protected guard={!!sessao}>
        <Stack.Screen name="index" options={{ headerShown: false, title: 'Hoje' }} />
        <Stack.Screen name="remedios" options={{ headerShown: false, title: 'Remédios', animation: 'none' }} />
        <Stack.Screen name="ajustes" options={{ headerShown: false, title: 'Ajustes', animation: 'none' }} />
        <Stack.Screen name="vincular" options={{ title: 'Vincular o celular' }} />
      </Stack.Protected>
    </Stack>
  );
}

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Layout() {
  // Fontes do design "Manhã Clara". Se falharem, o app segue com a fonte do sistema.
  const [carregadas, erro] = useFonts({
    AtkinsonHyperlegible_400Regular,
    AtkinsonHyperlegible_700Bold,
    Outfit_500Medium,
  });
  const pronto = carregadas || Boolean(erro);
  useEffect(() => {
    if (pronto) SplashScreen.hideAsync().catch(() => {});
  }, [pronto]);
  if (!pronto) return null;

  return (
    <SessaoProvider>
      <PacienteProvider>
        <StatusBar style="dark" />
        <Rotas />
      </PacienteProvider>
    </SessaoProvider>
  );
}

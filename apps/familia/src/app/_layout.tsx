import { fontesVariacaoE } from '@cuida/visual';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { registrarServiceWorker } from '@cuida/cliente';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { cores } from '@/components/ui';
import { fontes } from '@/lib/tema';
import { PacienteProvider } from '@/lib/paciente';
import { lerConvitePendente } from '@/lib/grupo';
import { registrarPush } from '@/lib/push';
import { SessaoProvider, useSessao } from '@/lib/sessao';
import { AceitarTermos } from '@/components/termos';
import { useTermos } from '@/lib/termos';

function Rotas() {
  const { sessao, carregando } = useSessao();
  const termos = useTermos(sessao);

  useEffect(() => {
    if (sessao) registrarPush(sessao.user.id).catch((e) => console.warn('Push:', e?.message ?? e));
  }, [sessao]);

  // Abriu um link de convite antes de entrar na conta: depois do login, volta para o convite.
  useEffect(() => {
    if (!sessao) return;
    lerConvitePendente().then((codigo) => {
      if (codigo) router.push({ pathname: '/convite', params: { codigo } });
    });
  }, [sessao]);

  if (carregando || (sessao && termos.estado === 'carregando')) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.fundo }}>
        <ActivityIndicator size="large" color={cores.primaria} />
      </View>
    );
  }

  // Termos do familiar (docs/PRD.md, "Dados e LGPD"): uma vez por versão, antes de tudo.
  if (sessao && termos.estado === 'falta') return <AceitarTermos aoAceitar={termos.aceitar} />;

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
        <Stack.Screen name="documentos/index" options={{ headerShown: false, title: 'Documentos', animation: 'none' }} />
        <Stack.Screen name="documentos/adicionar" options={{ headerShown: false, title: 'Adicionar documento' }} />
        <Stack.Screen name="documentos/receita" options={{ headerShown: false, title: 'Confira a receita' }} />
        <Stack.Screen name="documentos/pedido" options={{ headerShown: false, title: 'Confira o pedido' }} />
        <Stack.Screen name="vincular" options={{ headerShown: false, title: 'Conectar o celular' }} />
        <Stack.Screen name="grupo" options={{ headerShown: false, title: 'Grupo de cuidado' }} />
        <Stack.Screen name="consultas" options={{ headerShown: false, title: 'Consultas' }} />
      </Stack.Protected>
      <Stack.Screen name="convite" options={{ headerShown: false, title: 'Convite' }} />
      <Stack.Screen name="termos" options={{ headerShown: false, title: 'Termos de uso e privacidade' }} />
    </Stack>
  );
}

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Layout() {
  // Fontes da Variação E (Nunito e Atkinson Hyperlegible). Se falharem, o app segue com a fonte do sistema.
  const [carregadas, erro] = useFonts(fontesVariacaoE);
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
    <SessaoProvider>
      <PacienteProvider>
        <StatusBar style="dark" />
        <Rotas />
      </PacienteProvider>
    </SessaoProvider>
  );
}

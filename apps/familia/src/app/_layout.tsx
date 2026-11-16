import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { cores } from '@/components/ui';
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
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: 'Voltar',
        contentStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Stack.Protected guard={!sessao}>
        <Stack.Screen name="entrar" options={{ headerShown: false, title: 'Entrar' }} />
      </Stack.Protected>
      <Stack.Protected guard={!!sessao}>
        <Stack.Screen name="index" options={{ title: 'Cuida Família' }} />
        <Stack.Screen name="remedios" options={{ title: 'Remédios' }} />
        <Stack.Screen name="vincular" options={{ title: 'Vincular o celular' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function Layout() {
  return (
    <SessaoProvider>
      <PacienteProvider>
        <StatusBar style="dark" />
        <Rotas />
      </PacienteProvider>
    </SessaoProvider>
  );
}

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AparelhoProvider } from '@/lib/aparelho';
import { tema } from '@/lib/tema';

// Uma tela só, sem menus e sem gestos de deslizar: tudo é configurado pelo app da família.
export default function Layout() {
  return (
    <AparelhoProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
          animation: 'none',
          contentStyle: { backgroundColor: tema.fundo },
        }}
      />
    </AparelhoProvider>
  );
}

// /vitrine: página de conferência da Variação E (componentes de @cuida/visual). Nenhuma tela aponta para cá.
import { Vitrine } from '@cuida/visual';
import { Stack } from 'expo-router';

export default function PaginaVitrine() {
  return (
    <>
      <Stack.Screen options={{ title: 'Vitrine · Variação E', headerShown: false }} />
      <Vitrine />
    </>
  );
}

// Link do QR code (cuida-idoso://vincular?codigo=123456): vincula e volta para a tela única.
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAparelho } from '@/lib/aparelho';
import { cores } from '@/lib/tema';

export default function VincularPorLink() {
  const { codigo } = useLocalSearchParams<{ codigo?: string }>();
  const { carregando, paciente, vincular } = useAparelho();
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    if (carregando) return;
    if (paciente || !codigo || !/^\d{6}$/.test(codigo)) {
      setPronto(true);
      return;
    }
    vincular(codigo).finally(() => setPronto(true));
  }, [carregando, paciente, codigo, vincular]);

  if (pronto) return <Redirect href="/" />;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.fundo }}>
      <ActivityIndicator size="large" color={cores.tinta} />
    </View>
  );
}

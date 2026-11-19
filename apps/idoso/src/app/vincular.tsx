// Link de vínculo (/vincular?codigo=1234): vincula e volta para a tela única.
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAparelho } from '@/lib/aparelho';
import { cores } from '@cuida/visual';

export default function VincularPorLink() {
  const { codigo } = useLocalSearchParams<{ codigo?: string }>();
  const { carregando, paciente, vincular } = useAparelho();
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    if (carregando) return;
    if (paciente || !codigo || !/^\d{4}$/.test(codigo)) {
      setPronto(true);
      return;
    }
    vincular(codigo).finally(() => setPronto(true));
  }, [carregando, paciente, codigo, vincular]);

  if (pronto) return <Redirect href="/" />;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.fundo }}>
      <ActivityIndicator size="large" color={cores.primaria} />
    </View>
  );
}

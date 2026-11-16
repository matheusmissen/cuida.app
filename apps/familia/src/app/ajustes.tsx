import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HorarioCheckin } from '@/components/checkin-diario';
import { BarraNavegacao, ESPACO_BARRA } from '@/components/navegacao';
import { Botao, Cartao, Texto, Titulo, TituloPagina } from '@/components/ui';
import { usePaciente } from '@/lib/paciente';
import { supabase } from '@/lib/supabase';
import { espacos, paleta } from '@/lib/tema';

export default function Ajustes() {
  const { paciente } = usePaciente();
  const nome = paciente ? paciente.apelido || paciente.nome : '';
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: paleta.fundo }}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <TituloPagina style={{ paddingHorizontal: 4 }}>Ajustes</TituloPagina>
        {paciente && <HorarioCheckin />}
        {paciente && (
          <Cartao>
            <Titulo>Celular de {nome}</Titulo>
            <Texto suave>
              {paciente.usuario_id
                ? 'Celular vinculado. Um código novo troca para outro aparelho.'
                : 'Ainda não vinculado. Gere o código e mostre no celular.'}
            </Texto>
            <Botao variante="secundario" titulo="Vincular o celular" onPress={() => router.push('/vincular')} />
          </Cartao>
        )}
        <View style={{ height: 4 }} />
        <Botao variante="texto" titulo="Sair" onPress={() => supabase.auth.signOut()} />
      </ScrollView>
      <BarraNavegacao ativa="ajustes" />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  conteudo: {
    padding: espacos.margemTelaFamilia,
    paddingTop: 24,
    gap: 12,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: ESPACO_BARRA + 24,
  },
});

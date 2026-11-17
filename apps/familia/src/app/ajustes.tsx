import { condicoesParaSalvar } from '@cuida/cliente';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HorarioCheckin } from '@/components/checkin-diario';
import { CondicoesSaude, formDoPaciente, type FormCondicoes } from '@/components/condicoes-saude';
import { BarraNavegacao, ESPACO_BARRA } from '@/components/navegacao';
import { Botao, Cartao, Erro, Texto, Titulo, TituloPagina } from '@/components/ui';
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
        {paciente && <CondicoesDoPaciente />}
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

/** Condições de saúde da paciente, editáveis pela família (as mesmas do cadastro). */
function CondicoesDoPaciente() {
  const { paciente, recarregar } = usePaciente();
  const [form, setForm] = useState<FormCondicoes>(formDoPaciente(paciente));
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setForm(formDoPaciente(paciente));
  }, [paciente]);

  if (!paciente) return null;

  async function salvar() {
    if (!paciente) return;
    setErro(null);
    setAviso(null);
    setSalvando(true);
    const { error } = await supabase.from('pacientes').update(condicoesParaSalvar(form)).eq('id', paciente.id);
    setSalvando(false);
    if (error) return setErro(error.message);
    setAviso('Condições salvas.');
    await recarregar();
  }

  return (
    <Cartao>
      <Titulo>Condições de saúde</Titulo>
      <CondicoesSaude
        valor={form}
        aoMudar={(v) => {
          setAviso(null);
          setForm(v);
        }}
      />
      <Erro mensagem={erro} />
      {aviso && <Texto suave>{aviso}</Texto>}
      <Botao variante="secundario" titulo="Salvar condições" onPress={salvar} carregando={salvando} />
    </Cartao>
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

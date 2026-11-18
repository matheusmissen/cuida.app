import { condicoesParaSalvar, lerTelefone, telefoneFormatado } from '@cuida/cliente';
import {
  emModoDemonstracao,
  minutosPorExtenso,
  TEMPOS_DEMONSTRACAO,
  TEMPOS_PADRAO,
  temposDoPaciente,
  type Tempos,
} from '@cuida/regras';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HorarioCheckin } from '@/components/checkin-diario';
import { CartaoNotificacoes } from '@/components/notificacoes';
import { CondicoesSaude, formDoPaciente, type FormCondicoes } from '@/components/condicoes-saude';
import { BarraNavegacao, ESPACO_BARRA } from '@/components/navegacao';
import { Botao, Campo, Cartao, Erro, Texto, Titulo, TituloPagina } from '@/components/ui';
import { usePaciente } from '@/lib/paciente';
import { supabase } from '@/lib/supabase';
import { espacos, paleta } from '@/lib/tema';

export default function Ajustes() {
  const { paciente, papel } = usePaciente();
  const nome = paciente ? paciente.apelido || paciente.nome : '';
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: paleta.fundo }}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <TituloPagina style={{ paddingHorizontal: 4 }}>Ajustes</TituloPagina>
        {paciente && <HorarioCheckin />}
        <CartaoNotificacoes />
        {paciente && (
          <Cartao>
            <Titulo>Grupo de cuidado</Titulo>
            <Texto suave>
              {papel === 'principal'
                ? 'Veja quem acompanha, convide outros familiares e passe a responsabilidade.'
                : 'Veja quem acompanha e o seu papel no grupo.'}
            </Texto>
            <Botao variante="secundario" titulo="Abrir grupo de cuidado" onPress={() => router.push('/grupo')} />
          </Cartao>
        )}
        {paciente && <TelefoneDoPaciente />}
        {paciente && <TemposDosAvisos />}
        {paciente && <CondicoesDoPaciente />}
        {paciente && (
          <Cartao>
            <Titulo>Celular de {nome}</Titulo>
            <Texto suave>
              {paciente.usuario_id
                ? 'Celular vinculado. Um código novo troca para outro aparelho.'
                : 'Ainda não vinculado. Gere o código e mostre no celular.'}
            </Texto>
            <Botao variante="secundario" titulo="Conectar o celular" onPress={() => router.push('/vincular')} />
          </Cartao>
        )}
        <View style={{ height: 4 }} />
        <Botao variante="texto" titulo="Sair" onPress={() => supabase.auth.signOut()} />
      </ScrollView>
      <BarraNavegacao ativa="ajustes" />
    </SafeAreaView>
  );
}

/** Telefone do idoso, para o botão "Ligar" da tela do alerta. */
function TelefoneDoPaciente() {
  const { paciente, recarregar } = usePaciente();
  const [texto, setTexto] = useState(paciente?.telefone ? telefoneFormatado(paciente.telefone) : '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  if (!paciente) return null;
  const nome = paciente.apelido || paciente.nome;

  async function salvar() {
    if (!paciente) return;
    setErro(null);
    setAviso(null);
    const telefone = texto.trim() ? lerTelefone(texto) : null;
    if (texto.trim() && !telefone) return setErro('Telefone inválido. Use o DDD, por exemplo: (11) 98765-4321');
    setSalvando(true);
    const { error } = await supabase.from('pacientes').update({ telefone }).eq('id', paciente.id);
    setSalvando(false);
    if (error) return setErro(error.message);
    setAviso(telefone ? 'Telefone salvo.' : 'Telefone apagado.');
    await recarregar();
  }

  return (
    <Cartao>
      <Titulo>Telefone de {nome}</Titulo>
      <Texto suave>Usado no botão "Ligar" quando chega um alerta.</Texto>
      <Campo
        rotulo="Telefone com DDD"
        value={texto}
        onChangeText={(v) => {
          setAviso(null);
          setTexto(v);
        }}
        placeholder="(11) 98765-4321"
        keyboardType="phone-pad"
        autoComplete="tel"
      />
      <Erro mensagem={erro} />
      {aviso && <Texto suave>{aviso}</Texto>}
      <Botao variante="secundario" titulo="Salvar telefone" onPress={salvar} carregando={salvando} />
    </Cartao>
  );
}

const colunasDosTempos = (t: Tempos) => ({
  tolerancia_dose_min: t.toleranciaDoseMin,
  tolerancia_checkin_min: t.toleranciaCheckinMin,
  escalada_min: t.escaladaMin,
});

/**
 * Tempos de tolerância e escalada (docs/PRD.md). O modo demonstração põe tudo em 1 minuto,
 * para mostrar dose não confirmada → aviso ao responsável → alerta ao grupo na apresentação.
 */
function TemposDosAvisos() {
  const { paciente, recarregar } = usePaciente();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  if (!paciente) return null;
  const tempos = temposDoPaciente(paciente);
  const demonstracao = emModoDemonstracao(tempos);

  async function trocar() {
    if (!paciente) return;
    setErro(null);
    setSalvando(true);
    const novos = demonstracao ? TEMPOS_PADRAO : TEMPOS_DEMONSTRACAO;
    const { error } = await supabase.from('pacientes').update(colunasDosTempos(novos)).eq('id', paciente.id);
    setSalvando(false);
    if (error) return setErro(error.message);
    await recarregar();
  }

  return (
    <Cartao>
      <Titulo>Tempos dos avisos</Titulo>
      {demonstracao && <Texto>Modo demonstração ligado: todos os tempos estão em 1 minuto.</Texto>}
      <Texto suave>
        Remédio sem "Tomei" em {minutosPorExtenso(tempos.toleranciaDoseMin)}: o responsável principal é avisado.
      </Texto>
      <Texto suave>
        Check-in sem resposta em {minutosPorExtenso(tempos.toleranciaCheckinMin)}: o responsável principal é avisado.
      </Texto>
      <Texto suave>
        Se o responsável não agir em {minutosPorExtenso(tempos.escaladaMin)}, o aviso vai para todo o grupo.
      </Texto>
      <Erro mensagem={erro} />
      <Botao
        variante="secundario"
        titulo={demonstracao ? 'Voltar aos tempos normais' : 'Ligar modo demonstração (1 minuto)'}
        onPress={trocar}
        carregando={salvando}
      />
    </Cartao>
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

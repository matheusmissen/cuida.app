// Consultas da pessoa cuidada (docs/PRD.md, seção 7; visual da Variação E).
// A família cadastra; o idoso vê a próxima na tela inicial e recebe lembretes no dia anterior e 3 horas antes.
import {
  comQuem,
  instanteDaConsulta,
  lerDataDaConsulta,
  lerHora,
  quandoPorExtenso,
  type ConsultaLinha,
} from '@cuida/cliente';
import {
  BotaoPrincipal,
  BotaoSecundario,
  Campo,
  Cartao,
  cores,
  espacos,
  fontes,
  IconeCalendario,
  IconeVoltar,
  pasteis,
  Quadradinho,
  tamanhos,
} from '@cuida/visual';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useConsultas } from '@/lib/consultas';
import { usePaciente } from '@/lib/paciente';
import { supabase } from '@/lib/supabase';

const T = tamanhos.familia;

export default function Consultas() {
  const { paciente } = usePaciente();
  const { consultas, erro, recarregar } = useConsultas(paciente?.id);
  const [agora] = useState(() => new Date());
  const [novo, setNovo] = useState(false);
  if (!paciente) return null;
  const nome = paciente.apelido || paciente.nome;
  const futuras = consultas.filter((c) => Date.parse(c.quando) >= agora.getTime() - 3_600_000);
  const passadas = consultas.filter((c) => Date.parse(c.quando) < agora.getTime() - 3_600_000).reverse();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}>
      <ScrollView contentContainerStyle={estilos.tela} keyboardShouldPersistTaps="handled">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={({ pressed }) => [estilos.voltar, pressed && { opacity: 0.8 }]}
        >
          <IconeVoltar tamanho={20} cor={cores.texto} />
          <Text style={estilos.textoVoltar}>Voltar</Text>
        </Pressable>
        <Text style={estilos.titulo} accessibilityRole="header">
          Consultas de {nome}
        </Text>
        <Text style={estilos.suave}>
          {nome} vê a próxima consulta no celular e recebe lembretes no dia anterior e 3 horas antes.
        </Text>

        {novo ? (
          <NovaConsulta
            pacienteId={paciente.id}
            aoTerminar={() => {
              setNovo(false);
              recarregar();
            }}
          />
        ) : (
          <BotaoPrincipal tamanho="familia" rotulo="Nova consulta" onPress={() => setNovo(true)} />
        )}

        {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
        {futuras.length === 0 && !novo ? <Text style={estilos.suave}>Nenhuma consulta marcada.</Text> : null}
        {futuras.map((c) => (
          <ItemConsulta key={c.id} consulta={c} agora={agora} aoMudar={recarregar} />
        ))}
        {passadas.length > 0 ? <Text style={estilos.secao}>Já aconteceram</Text> : null}
        {passadas.slice(0, 10).map((c) => (
          <ItemConsulta key={c.id} consulta={c} agora={agora} aoMudar={recarregar} passada />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function ItemConsulta({
  consulta,
  agora,
  aoMudar,
  passada,
}: {
  consulta: ConsultaLinha;
  agora: Date;
  aoMudar: () => void;
  passada?: boolean;
}) {
  const [apagando, setApagando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  return (
    <Cartao style={[{ gap: 6 }, passada && { opacity: 0.7 }]}>
      <View style={estilos.linha}>
        <Quadradinho pastel="lilas" tamanho={44}>
          <IconeCalendario cor={pasteis.lilas.icone} />
        </Quadradinho>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={estilos.quando}>{quandoPorExtenso(consulta.quando, agora)}</Text>
          <Text style={estilos.texto}>{comQuem(consulta)}</Text>
        </View>
      </View>
      {consulta.local ? <Text style={estilos.suave}>{consulta.local}</Text> : null}
      {consulta.observacao ? <Text style={estilos.suave}>{consulta.observacao}</Text> : null}
      {confirmar ? (
        <View style={{ gap: 8 }}>
          <Text style={estilos.texto}>Apagar esta consulta?</Text>
          <BotaoPrincipal
            tamanho="familia"
            rotulo={apagando ? 'Apagando…' : 'Sim, apagar'}
            desabilitado={apagando}
            onPress={async () => {
              setApagando(true);
              await supabase.from('consultas').delete().eq('id', consulta.id);
              setApagando(false);
              aoMudar();
            }}
          />
          <BotaoSecundario tamanho="familia" rotulo="Não" onPress={() => setConfirmar(false)} />
        </View>
      ) : (
        <Pressable accessibilityRole="button" onPress={() => setConfirmar(true)} style={estilos.apagar}>
          <Text style={estilos.textoApagar}>Apagar</Text>
        </Pressable>
      )}
    </Cartao>
  );
}

function NovaConsulta({ pacienteId, aoTerminar }: { pacienteId: string; aoTerminar: () => void }) {
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [medico, setMedico] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [local, setLocal] = useState('');
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setErro(null);
    const agora = new Date();
    const dia = lerDataDaConsulta(data, agora);
    const h = lerHora(hora);
    if (!dia) return setErro('Data inválida. Use, por exemplo: 28/11');
    if (!h) return setErro('Horário inválido. Use, por exemplo: 14:30');
    if (!medico.trim() && !especialidade.trim()) return setErro('Informe o médico ou a especialidade.');
    const quando = instanteDaConsulta(dia, h);
    if (Date.parse(quando) < agora.getTime() - 3_600_000) return setErro('Essa data já passou.');
    setSalvando(true);
    const { error } = await supabase.from('consultas').insert({
      paciente_id: pacienteId,
      quando,
      medico: medico.trim() || null,
      especialidade: especialidade.trim() || null,
      local: local.trim() || null,
      observacao: observacao.trim() || null,
    });
    setSalvando(false);
    if (error) return setErro('Não foi possível salvar. Tente de novo.');
    aoTerminar();
  }

  return (
    <Cartao destaque style={{ gap: 12 }}>
      <Text style={estilos.secao}>Nova consulta</Text>
      <View style={estilos.linha}>
        <View style={{ flex: 1 }}>
          <Campo rotulo="Data" value={data} onChangeText={setData} placeholder="28/11" keyboardType="numbers-and-punctuation" />
        </View>
        <View style={{ flex: 1 }}>
          <Campo rotulo="Horário" value={hora} onChangeText={setHora} placeholder="14:30" keyboardType="numbers-and-punctuation" />
        </View>
      </View>
      <Campo rotulo="Médico" value={medico} onChangeText={setMedico} placeholder="Ex.: Dra. Ana" maxLength={80} />
      <Campo rotulo="Especialidade" value={especialidade} onChangeText={setEspecialidade} placeholder="Ex.: Hematologia" maxLength={60} />
      <Campo rotulo="Local (opcional)" value={local} onChangeText={setLocal} placeholder="Ex.: Clínica, endereço" maxLength={120} />
      <Campo rotulo="Observação (opcional)" value={observacao} onChangeText={setObservacao} placeholder="Ex.: levar os exames" maxLength={300} />
      {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
      <BotaoPrincipal tamanho="familia" rotulo={salvando ? 'Salvando…' : 'Salvar consulta'} onPress={salvar} desabilitado={salvando} />
      <BotaoSecundario tamanho="familia" rotulo="Cancelar" onPress={aoTerminar} />
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  tela: { padding: espacos.lateral, paddingTop: 24, paddingBottom: 40, gap: espacos.bloco, maxWidth: 640, width: '100%', alignSelf: 'center' },
  voltar: {
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingLeft: 12,
    paddingRight: 18,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  textoVoltar: { fontFamily: fontes.textoNegrito, fontSize: T.texto, color: cores.texto },
  titulo: { fontFamily: fontes.titulo, fontSize: T.titulo, lineHeight: T.titulo * 1.2, color: cores.texto },
  secao: { fontFamily: fontes.titulo, fontSize: 20, color: cores.texto },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  quando: { fontFamily: fontes.titulo, fontSize: 18, color: cores.texto },
  rotulo: { fontFamily: fontes.textoNegrito, fontSize: T.minimo + 1, color: cores.textoSuave },
  texto: { fontFamily: fontes.texto, fontSize: T.texto, lineHeight: 23, color: cores.texto },
  suave: { fontFamily: fontes.texto, fontSize: T.texto, lineHeight: 23, color: cores.textoSuave },
  erro: { fontFamily: fontes.textoNegrito, fontSize: T.texto, color: cores.alertaTexto },
  apagar: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  textoApagar: { fontFamily: fontes.textoNegrito, fontSize: T.texto, color: cores.alertaTexto, textDecorationLine: 'underline' },
});

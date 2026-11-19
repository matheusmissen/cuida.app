// Tela única do idoso (visual da Variação E, docs/design.md).
// Check-in do dia (6 rostinhos, antes de tudo) → início → (microfone) → conversa com a Lia → "Voltar ao início".
// Nos 3 rostinhos mais baixos, a Lia entra na conversa. O alarme de remédio aparece por cima de tudo.
// "Preciso de ajuda" fica sempre no fim do início e não depende da IA (pedir-ajuda → pedir_ajuda()).
import {
  dataCurta,
  dosesDevidas,
  ehPedidoDeAjuda,
  horaCurta,
  mensagemDaAjuda,
  comQuem,
  consentimentoDoPaciente,
  pedirAjuda,
  perguntaDoCheckin,
  proximaDose,
  quandoPorExtenso,
  registrarRostinho,
  respostaAoRostinho,
  saudacao,
  type Escolhas,
  type ResultadoAjuda,
} from '@cuida/cliente';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { temposDoPaciente, type NivelCheckin, type Tempos } from '@cuida/regras';
import { Alarme } from '@/components/alarme';
import { AvisosNotificacao } from '@/components/avisos-notificacao';
import { TelaCheckin } from '@/components/checkin';
import { TelaConsentimento } from '@/components/consentimento';
import { QuemAcompanha } from '@/components/quem-acompanha';
import { TelaConversa } from '@/components/conversa';
import { TelaFamiliaAvisada } from '@/components/familia-avisada';
import { BotaoAjuda } from '@/components/botao-ajuda';
import { IconeMicrofone } from '@/components/icones';
import { TelaInstalar } from '@/components/instalar';
import { PedirAvisos } from '@/components/pedir-avisos';
import { PrimeiroAcesso } from '@/components/primeiro-acesso';
import { useAparelho } from '@/lib/aparelho';
import { useInstalacao } from '@/lib/instalacao';
import { useNotificacoes } from '@/lib/notificacoes';
import { supabase } from '@/lib/supabase';
import {
  BotaoPrincipal,
  Cartao,
  cores,
  espacos,
  fontes,
  IconeCalendario,
  IconePilula,
  Paisagem,
  paisagem,
  pasteis,
  Quadradinho,
  tamanhos,
  usePeriodo,
} from '@cuida/visual';
import { useAdiamentos } from '@/lib/adiamentos';
import { useCheckin } from '@/lib/use-checkin';
import { useProximaConsulta } from '@/lib/use-consultas';
import { useConversa } from '@/lib/use-conversa';
import { useDoses } from '@/lib/use-doses';
import { falar, NOME_ASSISTENTE, useUltimaFala } from '@/lib/voz';

/** Por quanto tempo a última fala da Lia fica no início (depois do "Tomei", por exemplo). */
const FALA_RECENTE_MS = 90_000;

const CHAVE_AVISOS_PERGUNTADOS = 'cuida.avisos_perguntados';

export default function Inicio() {
  const { carregando, paciente, erro, recarregar } = useAparelho();
  const [gravandoConsentimento, setGravandoConsentimento] = useState(false);
  const [erroConsentimento, setErroConsentimento] = useState<string | null>(null);
  const responderConsentimento = async (escolhas: Escolhas): Promise<boolean> => {
    setErroConsentimento(null);
    setGravandoConsentimento(true);
    const { error } = await supabase.rpc('registrar_consentimento', {
      p_registro: escolhas.registro,
      p_familia: escolhas.familia,
      p_lia: escolhas.lia,
    });
    if (!error) await recarregar();
    setGravandoConsentimento(false);
    if (error) setErroConsentimento('Não consegui guardar agora. Verifique a internet e toque de novo.');
    return !error;
  };
  const instalacao = useInstalacao();
  const notificacoes = useNotificacoes();
  // Os avisos são pedidos uma vez, logo depois do código (docs/PRD.md, tela 2 do idoso).
  const [avisosPerguntados, setAvisosPerguntados] = useState<boolean | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(CHAVE_AVISOS_PERGUNTADOS)
      .then((v) => setAvisosPerguntados(v === 'sim'))
      .catch(() => setAvisosPerguntados(true));
  }, []);
  const marcarAvisosPerguntados = () => {
    setAvisosPerguntados(true);
    AsyncStorage.setItem(CHAVE_AVISOS_PERGUNTADOS, 'sim').catch(() => {});
  };

  if (carregando || instalacao.carregando) {
    return (
      <SafeAreaView style={estilos.centro}>
        <ActivityIndicator size="large" color={cores.primaria} />
      </SafeAreaView>
    );
  }
  if (erro) {
    return (
      <SafeAreaView style={estilos.centro}>
        <Text style={[estilos.texto, { textAlign: 'center' }]}>{erro}</Text>
      </SafeAreaView>
    );
  }
  if (!paciente) {
    // Tela 1 (instalar, só no celular ainda não instalado) e tela 2 (código de 4 números).
    if (instalacao.mostrarTela) return <TelaInstalar instalacao={instalacao} />;
    return <PrimeiroAcesso />;
  }
  const apelidoDoPaciente = paciente.apelido || paciente.nome.split(' ')[0];
  // Tela 3: consentimento do idoso, uma vez, antes de tudo (docs/PRD.md, "Dados e LGPD").
  if (!paciente.consentimento_respondido_em) {
    return (
      <TelaConsentimento
        apelido={apelidoDoPaciente}
        enviando={gravandoConsentimento}
        erro={erroConsentimento}
        onConfirmar={responderConsentimento}
      />
    );
  }
  if (avisosPerguntados === false && notificacoes.estado === 'pedir') {
    return (
      <PedirAvisos
        ativando={notificacoes.ativando}
        onAtivar={async () => {
          await notificacoes.ativar();
          marcarAvisosPerguntados();
        }}
        onDepois={marcarAvisosPerguntados}
      />
    );
  }
  return (
    <TelaDoDia
      pacienteId={paciente.id}
      apelido={apelidoDoPaciente}
      horarioCheckin={paciente.horario_checkin}
      tempos={temposDoPaciente(paciente)}
      consentimento={consentimentoDoPaciente(paciente).escolhas}
      privacidade={{
        enviando: gravandoConsentimento,
        erro: erroConsentimento,
        responder: responderConsentimento,
      }}
    />
  );
}

type Modo = 'inicio' | 'conversa' | 'avisada' | 'privacidade';

function TelaDoDia({
  pacienteId,
  apelido,
  horarioCheckin,
  tempos,
  consentimento,
  privacidade,
}: {
  pacienteId: string;
  apelido: string;
  horarioCheckin: string | null;
  tempos: Tempos;
  consentimento: Escolhas;
  privacidade: {
    enviando: boolean;
    erro: string | null;
    responder: (e: Escolhas) => Promise<boolean>;
  };
}) {
  const comLia = consentimento.lia;
  const { doses, agora, confirmar } = useDoses(pacienteId);
  const consulta = useProximaConsulta(pacienteId, agora);
  const { convite, recarregar: recarregarCheckin } = useCheckin(pacienteId, apelido, horarioCheckin, agora);
  const conversa = useConversa({ aoResponder: recarregarCheckin });
  const [modo, setModo] = useState<Modo>('inicio');
  const [resultadoAjuda, setResultadoAjuda] = useState<ResultadoAjuda>('avisada');
  const [enviandoAjuda, setEnviandoAjuda] = useState(false);
  // Na web o navegador só deixa falar depois de um toque: um botão "Começar" na abertura.
  const [iniciado, setIniciado] = useState(Platform.OS !== 'web');
  const chamadas = useRef(new Set<string>());
  // Check-in com rostinhos: escolhido, gravando e erro (sem internet).
  const [rostinho, setRostinho] = useState<NivelCheckin | null>(null);
  const [gravandoRostinho, setGravandoRostinho] = useState(false);
  const [erroRostinho, setErroRostinho] = useState<string | null>(null);
  const [checkinFeito, setCheckinFeito] = useState<string | null>(null); // chave do dia já respondido
  const ultimaFala = useUltimaFala();

  const { adiada, adiarDose } = useAdiamentos();
  // "Me lembre daqui a 10 minutos": o alarme adiado some e volta sozinho.
  const devidas = dosesDevidas(doses, agora).filter((d) => !adiada(d.id, agora));
  const proxima = proximaDose(doses, agora);
  const fmtDia = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
  });
  const hoje = fmtDia.format(agora);
  const dosesHoje = doses.filter((d) => fmtDia.format(new Date(d.previsto_em)) === hoje);
  const tomadasHoje = dosesHoje.filter((d) => d.confirmado_em).length;

  // Check-in diário: a tela dos rostinhos vem antes de tudo; a Lia faz a pergunta uma vez por dia,
  // depois de qualquer alarme.
  const alarmeAberto = Boolean(devidas[0]);
  const mostrarCheckin = Boolean(convite) && checkinFeito !== convite?.chave && modo === 'inicio';
  useEffect(() => {
    if (!iniciado || alarmeAberto || !mostrarCheckin || !convite) return;
    if (chamadas.current.has(convite.chave)) return;
    chamadas.current.add(convite.chave);
    falar(perguntaDoCheckin(apelido, new Date()));
  }, [iniciado, alarmeAberto, mostrarCheckin, convite, apelido]);

  const escolherRostinho = async (nivel: NivelCheckin) => {
    if (gravandoRostinho || !convite) return;
    setRostinho(nivel);
    setErroRostinho(null);
    setGravandoRostinho(true);
    const gravou = await registrarRostinho({
      funcao: async () =>
        await supabase.functions.invoke('registrar-checkin', {
          body: { nivel },
        }),
      banco: async () => await supabase.rpc('registrar_rostinho', { p_nivel: nivel }),
    });
    setGravandoRostinho(false);
    if (!gravou) {
      setErroRostinho('Não consegui guardar agora. Verifique a internet e toque de novo.');
      return;
    }
    setCheckinFeito(convite.chave);
    setRostinho(null);
    recarregarCheckin();
    const resposta = respostaAoRostinho(nivel, apelido, comLia);
    if (resposta.conversar) {
      setModo('conversa');
      conversa.iniciarPelaLia(resposta.fala);
    } else {
      falar(resposta.fala);
    }
  };

  // Pedido de ajuda registrado pelo agente: mostra "Sua família foi avisada".
  useEffect(() => {
    if (conversa.alertas.some(ehPedidoDeAjuda)) {
      setResultadoAjuda('avisada');
      setModo('avisada');
    }
  }, [conversa.alertas]);

  // Botão "Preciso de ajuda": Edge Function (alerta + push); se falhar, grava direto no banco.
  const apertarAjuda = async () => {
    if (enviandoAjuda) return;
    setEnviandoAjuda(true);
    const resultado = await pedirAjuda({
      funcao: async () => await supabase.functions.invoke('pedir-ajuda', { body: {} }),
      banco: async () => await supabase.rpc('pedir_ajuda'),
    });
    setEnviandoAjuda(false);
    setResultadoAjuda(resultado);
    setModo('avisada');
    falar(mensagemDaAjuda(resultado).fala);
  };

  const botaoAjuda = <BotaoAjuda enviando={enviandoAjuda} onPress={apertarAjuda} />;

  const alarme = devidas[0] && (
    <Alarme dose={devidas[0]} apelido={apelido} agora={agora} tempos={tempos} onTomei={confirmar} onAdiar={adiarDose} />
  );

  if (!iniciado) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['bottom']}>
        <Cabecalho agora={agora} apelido={apelido} />
        <View style={estilos.comecar}>
          <Text style={[estilos.textoGrande, { textAlign: 'center' }]}>Toque em Começar para abrir o Cuida.</Text>
          <BotaoPrincipal
            rotulo="Começar"
            onPress={() => {
              setIniciado(true);
              falar(
                comLia
                  ? `${saudacao(agora)}, ${apelido}! Eu sou a ${NOME_ASSISTENTE}. Quando quiser conversar, aperte o botão do microfone.`
                  : `${saudacao(agora)}, ${apelido}! Se precisar, aperte "Preciso de ajuda".`,
              );
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (mostrarCheckin) {
    return (
      <>
        <TelaCheckin
          agora={agora}
          escolhido={rostinho}
          enviando={gravandoRostinho}
          erro={erroRostinho}
          onEscolher={escolherRostinho}
          botaoAjuda={botaoAjuda}
        />
        {alarme}
      </>
    );
  }

  if (modo === 'privacidade') {
    return (
      <>
        <TelaConsentimento
          apelido={apelido}
          titulo="Minha privacidade"
          inicial={consentimento}
          enviando={privacidade.enviando}
          erro={privacidade.erro}
          onConfirmar={async (e) => {
            if (await privacidade.responder(e)) {
              setModo('inicio');
              falar('Pronto, guardei as suas escolhas.');
            }
          }}
          onVoltar={() => setModo('inicio')}
          depois={<QuemAcompanha />}
        />
        {alarme}
      </>
    );
  }

  if (modo === 'conversa') {
    return (
      <>
        <TelaConversa conversa={conversa} aoVoltar={() => setModo('inicio')} />
        {alarme}
      </>
    );
  }
  if (modo === 'avisada') {
    return (
      <>
        <TelaFamiliaAvisada aoVoltar={() => setModo('inicio')} resultado={resultadoAjuda} />
        {alarme}
      </>
    );
  }

  const falaRecente = ultimaFala && agora.getTime() - ultimaFala.em < FALA_RECENTE_MS ? ultimaFala.texto : null;
  const rotuloMic = convite ? `Responder à ${NOME_ASSISTENTE}` : `Falar com a ${NOME_ASSISTENTE}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Cabecalho agora={agora} apelido={apelido} />
        <View style={estilos.tela}>
          <AvisosNotificacao />

          <Cartao style={estilos.cartao}>
            <View style={estilos.rotulo}>
              <Quadradinho pastel="lilas" tamanho={48}>
                <IconePilula tamanho={26} cor={pasteis.lilas.icone} />
              </Quadradinho>
              <Text style={estilos.rotuloTexto}>Próximo remédio</Text>
            </View>
            {proxima ? (
              <View style={estilos.proximo}>
                <Text style={estilos.horario}>{horaCurta(proxima.previsto_em)}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={estilos.nomeRemedio}>{proxima.horarios.remedios.nome}</Text>
                  <Text style={estilos.textoSuave}>{proxima.horarios.remedios.dose}</Text>
                </View>
              </View>
            ) : (
              <Text style={estilos.nomeRemedio}>Nenhum remédio marcado para depois.</Text>
            )}
            {dosesHoje.length > 0 && (
              <View style={estilos.progresso}>
                <View style={estilos.barras} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  {dosesHoje.map((d) => (
                    <View
                      key={d.id}
                      style={[estilos.barra, { backgroundColor: d.confirmado_em ? cores.primaria : pasteis.menta.borda }]}
                    />
                  ))}
                </View>
                <Text style={estilos.texto}>
                  <Text style={{ fontFamily: fontes.textoNegrito }}>
                    {tomadasHoje} de {dosesHoje.length}
                  </Text>{' '}
                  remédios hoje
                </Text>
              </View>
            )}
          </Cartao>

          {consulta && (
            <Cartao pastel="menta" style={estilos.cartao}>
              <View style={estilos.rotulo}>
                <Quadradinho pastel="menta" tamanho={48}>
                  <IconeCalendario tamanho={26} cor={pasteis.menta.icone} />
                </Quadradinho>
                <Text style={estilos.rotuloTexto}>Próxima consulta</Text>
              </View>
              <Text style={estilos.titulo}>{quandoPorExtenso(consulta.quando, agora)}</Text>
              <Text style={estilos.textoGrande}>com {comQuem(consulta)}</Text>
              {consulta.local ? <Text style={estilos.textoSuave}>{consulta.local}</Text> : null}
            </Cartao>
          )}

          {falaRecente && (
            <Cartao pastel="pessego" style={estilos.cartao}>
              <View accessibilityLiveRegion="polite" style={{ gap: 6 }}>
                <Text style={[estilos.rotuloTexto, { color: pasteis.pessego.icone }]}>{NOME_ASSISTENTE}</Text>
                <Text style={estilos.fala}>{falaRecente}</Text>
              </View>
            </Cartao>
          )}

          {/* Sem o consentimento "conversar com a Lia", o botão da Lia não aparece. */}
          {comLia ? (
            <View style={estilos.blocoMic}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={rotuloMic}
                onPress={() => {
                  setModo('conversa');
                  // Sem reconhecimento de fala (ex.: Firefox), a conversa abre com o campo de texto.
                  if (conversa.podeOuvir) conversa.comecar();
                }}
                style={({ pressed }) => [estilos.mic, pressed && { opacity: 0.85 }]}
              >
                <IconeMicrofone tamanho={58} cor={cores.sobrePrimaria} traco={2.1} />
              </Pressable>
              <Text style={[estilos.titulo, { textAlign: 'center' }]}>{rotuloMic}</Text>
            </View>
          ) : (
            <View style={{ flexGrow: 1 }} />
          )}

          {botaoAjuda}

          <Pressable
            accessibilityRole="button"
            onPress={() => setModo('privacidade')}
            style={({ pressed }) => [estilos.privacidade, pressed && { opacity: 0.7 }]}
          >
            <Text style={estilos.linkPrivacidade}>Minha privacidade</Text>
          </Pressable>
        </View>
      </ScrollView>
      {alarme}
    </SafeAreaView>
  );
}

/** Topo do início: paisagem com água, data e saudação (cores do texto seguem o dia ou a noite). */
function Cabecalho({ agora, apelido, altura = 210 }: { agora: Date; apelido: string; altura?: number }) {
  const periodo = usePeriodo();
  const cor = paisagem[periodo].texto;
  return (
    <Paisagem agua altura={altura}>
      <Text style={[estilos.data, { color: cor }]}>{dataCurta(agora)}</Text>
      <Text style={[estilos.saudacao, { color: cor }]} accessibilityRole="header">
        {`${saudacao(agora)},\n${apelido}`}
      </Text>
    </Paisagem>
  );
}

const estilos = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espacos.lateral,
    backgroundColor: cores.fundo,
  },
  comecar: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
    padding: espacos.lateral,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  tela: {
    flexGrow: 1,
    paddingHorizontal: espacos.lateral,
    paddingTop: 20,
    paddingBottom: 24,
    gap: espacos.bloco,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  data: { fontFamily: fontes.texto, fontSize: 20 },
  saudacao: { fontFamily: fontes.titulo, fontSize: tamanhos.idoso.titulo, lineHeight: 38, marginTop: 4 },
  cartao: { gap: 14 },
  rotulo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rotuloTexto: { fontFamily: fontes.textoNegrito, fontSize: 20, color: cores.texto },
  proximo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  horario: {
    fontFamily: fontes.titulo,
    fontSize: tamanhos.idoso.horario,
    lineHeight: tamanhos.idoso.horario + 4,
    color: cores.texto,
    letterSpacing: -1,
  },
  nomeRemedio: { fontFamily: fontes.textoNegrito, fontSize: 24, lineHeight: 30, color: cores.texto },
  titulo: { fontFamily: fontes.titulo, fontSize: 26, lineHeight: 32, color: cores.texto },
  texto: { fontFamily: fontes.texto, fontSize: 20, lineHeight: 27, color: cores.texto },
  textoGrande: { fontFamily: fontes.texto, fontSize: 22, lineHeight: 29, color: cores.texto },
  textoSuave: { fontFamily: fontes.texto, fontSize: 20, lineHeight: 27, color: cores.textoSuave },
  fala: { fontFamily: fontes.titulo, fontSize: 24, lineHeight: 31, color: cores.texto },
  progresso: {
    backgroundColor: pasteis.menta.fundo,
    borderColor: pasteis.menta.borda,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  barras: { flexDirection: 'row', gap: 6 },
  barra: { flex: 1, height: 10, borderRadius: 5 },
  blocoMic: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 22,
  },
  mic: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: cores.primaria,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 10,
    borderColor: pasteis.menta.fundo,
  },
  privacidade: { minHeight: 56, alignItems: 'center', justifyContent: 'center' },
  linkPrivacidade: {
    fontFamily: fontes.textoNegrito,
    fontSize: 20,
    color: cores.textoSuave,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});

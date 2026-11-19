// Tela única do idoso (referência: docs/design/telas/Idoso-Inicio.dc.html).
// Check-in do dia (6 rostinhos, antes de tudo) → início → (microfone) → conversa com a Lia → "Voltar ao início".
// Nos 3 rostinhos mais baixos, a Lia entra na conversa. O alarme de remédio aparece por cima de tudo.
// "Preciso de ajuda" fica sempre no fim do início e não depende da IA (pedir-ajuda → pedir_ajuda()).
import {
  dataCurta,
  dosesDevidas,
  ehPedidoDeAjuda,
  horaCurta,
  mensagemDaAjuda,
  consentimentoDoPaciente,
  pedirAjuda,
  perguntaDoCheckin,
  proximaDose,
  registrarRostinho,
  respostaAoRostinho,
  saudacao,
  type Escolhas,
  type ResultadoAjuda,
} from '@cuida/cliente';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { temposDoPaciente, type NivelCheckin, type Tempos } from '@cuida/regras';
import { Alarme } from '@/components/alarme';
import { AvisosNotificacao } from '@/components/avisos-notificacao';
import { TelaCheckin } from '@/components/checkin';
import { TelaConsentimento } from '@/components/consentimento';
import { TelaConversa } from '@/components/conversa';
import { TelaFamiliaAvisada } from '@/components/familia-avisada';
import { IconeMicrofone, IconeTelefone } from '@/components/icones';
import { BotaoPrincipal, Destaque, Texto } from '@/components/ui';
import { TelaInstalar } from '@/components/instalar';
import { PedirAvisos } from '@/components/pedir-avisos';
import { PrimeiroAcesso } from '@/components/primeiro-acesso';
import { useAparelho } from '@/lib/aparelho';
import { useInstalacao } from '@/lib/instalacao';
import { useNotificacoes } from '@/lib/notificacoes';
import { supabase } from '@/lib/supabase';
import { alvos, cores, espacos, sombras, tamanhos } from '@/lib/tema';
import { useAdiamentos } from '@/lib/adiamentos';
import { useCheckin } from '@/lib/use-checkin';
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
        <ActivityIndicator size="large" color={cores.tinta} />
      </SafeAreaView>
    );
  }
  if (erro) {
    return (
      <SafeAreaView style={estilos.centro}>
        <Texto style={{ textAlign: 'center' }}>{erro}</Texto>
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

  const botaoAjuda = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Preciso de ajuda. Avisa toda a sua família agora."
      accessibilityState={{ busy: enviandoAjuda, disabled: enviandoAjuda }}
      disabled={enviandoAjuda}
      onPress={apertarAjuda}
      style={({ pressed }) => [estilos.ajuda, (pressed || enviandoAjuda) && { opacity: 0.85 }]}
    >
      <View style={estilos.ajudaIcone}>
        {enviandoAjuda ? (
          <ActivityIndicator color={cores.sobreTinta} />
        ) : (
          <IconeTelefone tamanho={24} cor={cores.sobreTinta} traco={2.2} />
        )}
      </View>
      <Texto tamanho={24} peso="negrito" cor={cores.alerta.texto}>
        {enviandoAjuda ? 'Avisando sua família…' : 'Preciso de ajuda'}
      </Texto>
    </Pressable>
  );

  const alarme = devidas[0] && (
    <Alarme dose={devidas[0]} apelido={apelido} agora={agora} tempos={tempos} onTomei={confirmar} onAdiar={adiarDose} />
  );

  if (!iniciado) {
    return (
      <SafeAreaView style={estilos.centro}>
        <View style={{ gap: 6, alignSelf: 'stretch' }}>
          <Texto tamanho={20} cor={cores.textoSuave}>
            {dataCurta(agora)}
          </Texto>
          <Destaque tamanho={tamanhos.titulo}>{`${saudacao(agora)},\n${apelido}`}</Destaque>
        </View>
        <BotaoPrincipal
          titulo="Começar"
          onPress={() => {
            setIniciado(true);
            falar(
              comLia
                ? `${saudacao(agora)}, ${apelido}! Eu sou a ${NOME_ASSISTENTE}. Quando quiser conversar, aperte o botão do microfone.`
                : `${saudacao(agora)}, ${apelido}! Se precisar, aperte "Preciso de ajuda".`,
            );
          }}
        />
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
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}>
      <ScrollView contentContainerStyle={estilos.tela}>
        <View style={{ gap: 6 }}>
          <Texto tamanho={20} cor={cores.textoSuave}>
            {dataCurta(agora)}
          </Texto>
          <Destaque tamanho={tamanhos.titulo} accessibilityRole="header">
            {`${saudacao(agora)},\n${apelido}`}
          </Destaque>
        </View>

        <AvisosNotificacao />

        <View style={estilos.remedios}>
          <View style={estilos.rotulo}>
            <View style={estilos.ponto} />
            <Texto tamanho={20} cor={cores.salvia.texto}>
              Próximo remédio
            </Texto>
          </View>
          {proxima ? (
            <View style={estilos.proximo}>
              <Destaque
                tamanho={tamanhos.horario}
                style={{
                  lineHeight: tamanhos.horario,
                  letterSpacing: -0.02 * tamanhos.horario,
                }}
              >
                {horaCurta(proxima.previsto_em)}
              </Destaque>
              <View style={{ flex: 1, gap: 2 }}>
                <Texto tamanho={24} peso="negrito">
                  {proxima.horarios.remedios.nome}
                </Texto>
                <Texto tamanho={20} cor={cores.salvia.texto}>
                  {proxima.horarios.remedios.dose}
                </Texto>
              </View>
            </View>
          ) : (
            <Texto tamanho={24} peso="negrito">
              Nenhum remédio marcado para depois.
            </Texto>
          )}
          {dosesHoje.length > 0 && (
            <View style={estilos.progresso}>
              <View style={estilos.barras} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                {dosesHoje.map((d) => (
                  <View
                    key={d.id}
                    style={[
                      estilos.barra,
                      {
                        backgroundColor: d.confirmado_em ? cores.salvia.forte : cores.salvia.borda,
                      },
                    ]}
                  />
                ))}
              </View>
              <Texto tamanho={20}>
                <Texto tamanho={20} peso="negrito">
                  {tomadasHoje} de {dosesHoje.length}
                </Texto>{' '}
                remédios hoje
              </Texto>
            </View>
          )}
        </View>

        {falaRecente && (
          <View style={estilos.lia} accessibilityLiveRegion="polite">
            <Texto tamanho={20} peso="negrito" cor={cores.lilas.texto}>
              {NOME_ASSISTENTE}
            </Texto>
            <Destaque tamanho={tamanhos.destaque} style={{ lineHeight: 30 }}>
              {falaRecente}
            </Destaque>
          </View>
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
              <IconeMicrofone tamanho={60} cor={cores.sobreTinta} traco={1.8} />
            </Pressable>
            <Destaque tamanho={28} style={{ marginTop: 14, textAlign: 'center' }}>
              {rotuloMic}
            </Destaque>
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
          <Texto
            tamanho={20}
            peso="negrito"
            cor={cores.textoSuave}
            style={{ textDecorationLine: 'underline', textAlign: 'center' }}
          >
            Minha privacidade
          </Texto>
        </Pressable>
      </ScrollView>
      {alarme}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espacos.margemTela,
    gap: 40,
    backgroundColor: cores.fundo,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  tela: {
    flexGrow: 1,
    paddingHorizontal: espacos.margemTela,
    paddingTop: 36,
    paddingBottom: 28,
    gap: 22,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  remedios: {
    backgroundColor: cores.salvia.fundo,
    borderRadius: 34,
    padding: 22,
    gap: 16,
  },
  rotulo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ponto: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: cores.salvia.forte,
  },
  proximo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  progresso: {
    backgroundColor: cores.salvia.fundoClaro,
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  barras: { flexDirection: 'row', gap: 6 },
  barra: { flex: 1, height: 10, borderRadius: 5 },
  lia: {
    backgroundColor: cores.lilas.fundo,
    borderRadius: 28,
    padding: 20,
    gap: 6,
  },
  blocoMic: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    paddingVertical: 28,
  },
  ajuda: {
    minHeight: 72,
    borderRadius: 36,
    backgroundColor: cores.alerta.fundo,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 20,
  },
  ajudaIcone: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: cores.alerta.forte,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacidade: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mic: {
    width: alvos.microfone,
    height: alvos.microfone,
    borderRadius: alvos.microfone / 2,
    backgroundColor: cores.tinta,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: sombras.haloMicrofone,
  },
});

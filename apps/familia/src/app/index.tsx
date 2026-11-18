// Painel do dia da família (referências: docs/design/telas/Familia-Painel.dc.html e Familia-Alerta.dc.html).
import {
  checkinDoPainel,
  horaCurta,
  SELECT_DOSE,
  situacaoDose,
  type AlertaLinha,
  type CheckinLinha,
  type DoseComRemedio,
  type SituacaoDose,
  SELECT_ALERTA,
} from '@cuida/cliente';
import { temposDoPaciente } from '@cuida/regras';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CartaoUrgente, useAvisoUrgente } from '@/components/alerta-urgente';
import { TelaAlerta } from '@/components/tela-alerta';
import { CadastroPaciente } from '@/components/cadastro-paciente';
import { CartaoConsentimento } from '@/components/consentimento';
import { CartaoUltimoCheckin } from '@/components/checkin-diario';
import { CartaoNotificacoes } from '@/components/notificacoes';
import { BarraNavegacao, ESPACO_BARRA } from '@/components/navegacao';
import { Avatar, Botao, Cartao, cores, Divisor, Erro, Selo, Texto, Titulo, TituloPagina } from '@/components/ui';
import { usePaciente } from '@/lib/paciente';
import { useSessao } from '@/lib/sessao';
import { supabase } from '@/lib/supabase';
import { espacos, fontes, paleta } from '@/lib/tema';

type Cor = { texto: string; cor: string; fundo: string };
const SITUACAO: Record<SituacaoDose, Cor> = {
  tomada: { texto: 'Tomou', cor: paleta.salvia.texto, fundo: paleta.salvia.fundo },
  perdida: { texto: 'Não confirmou', cor: paleta.alerta.texto, fundo: paleta.alerta.fundo },
  agora: { texto: 'Alarme tocando', cor: paleta.salvia.texto, fundo: paleta.salvia.fundo },
  futura: { texto: 'Mais tarde', cor: paleta.textoSuave, fundo: paleta.superficieNeutra },
};
const PROXIMO: Cor = { texto: 'Próximo', cor: paleta.sobreTinta, fundo: paleta.tinta };
const NIVEL: Record<AlertaLinha['nivel'], string> = {
  vermelho: 'Urgente',
  laranja: 'Atenção',
  amarelo: 'Acompanhar',
  informativo: 'Histórico',
};

/** Início e fim do dia de hoje no horário de Brasília (sem horário de verão). */
function limitesDeHoje(): [string, string] {
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  return [`${hoje}T00:00:00-03:00`, `${hoje}T23:59:59-03:00`];
}

/** 'há 3 min' separado em prefixo e valor, para o número grande do resumo. */
function haQuantoTempo(iso: string | null, agora: Date): [string, string] {
  if (!iso) return ['', 'nunca'];
  const min = Math.round((agora.getTime() - Date.parse(iso)) / 60_000);
  if (min < 1) return ['', 'agora'];
  if (min < 60) return ['há ', `${min} min`];
  const h = Math.floor(min / 60);
  if (h < 24) return ['há ', `${h} h`];
  return ['há ', `${Math.floor(h / 24)} d`];
}

export default function Painel() {
  const { paciente, carregando, erro } = usePaciente();

  if (carregando) {
    return <ActivityIndicator style={{ marginTop: 48 }} size="large" color={cores.texto} />;
  }
  if (!paciente) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}>
        <ScrollView contentContainerStyle={estilos.conteudo}>
          <TituloPagina style={{ paddingHorizontal: 4 }}>Cuida Família</TituloPagina>
          <Erro mensagem={erro} />
          <CadastroPaciente />
          <Botao variante="texto" titulo="Sair" onPress={() => supabase.auth.signOut()} />
        </ScrollView>
      </SafeAreaView>
    );
  }
  return <PainelDoDia pacienteId={paciente.id} />;
}

function PainelDoDia({ pacienteId }: { pacienteId: string }) {
  const { paciente, papel } = usePaciente();
  const { sessao } = useSessao();
  const [doses, setDoses] = useState<DoseComRemedio[]>([]);
  const [alertas, setAlertas] = useState<AlertaLinha[]>([]);
  const [ultimoCheckin, setUltimoCheckin] = useState<CheckinLinha | null>(null);
  const [ultimaInteracao, setUltimaInteracao] = useState<string | null>(paciente?.ultima_interacao_em ?? null);
  const [agora, setAgora] = useState(new Date());
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const [inicio, fim] = limitesDeHoje();
    const [d, a, p, c] = await Promise.all([
      supabase
        .from('doses')
        .select(SELECT_DOSE)
        .eq('paciente_id', pacienteId)
        .gte('previsto_em', inicio)
        .lte('previsto_em', fim)
        .order('previsto_em'),
      supabase
        .from('alertas')
        .select(SELECT_ALERTA)
        .eq('paciente_id', pacienteId)
        .order('criado_em', { ascending: false })
        .limit(20),
      supabase.from('pacientes').select('ultima_interacao_em').eq('id', pacienteId).single(),
      supabase
        .from('checkins')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('feito_em', { ascending: false })
        .limit(5),
    ]);
    // O rostinho e a conversa com a Lia do mesmo dia aparecem juntos.
    setUltimoCheckin(checkinDoPainel((c.data as CheckinLinha[] | null) ?? []));
    setErro(d.error?.message ?? a.error?.message ?? null);
    setDoses((d.data as unknown as DoseComRemedio[]) ?? []);
    setAlertas((a.data as AlertaLinha[]) ?? []);
    setUltimaInteracao(p.data?.ultima_interacao_em ?? null);
    setAgora(new Date());
  }, [pacienteId]);

  useEffect(() => {
    supabase.rpc('gerar_doses_hoje', { p_paciente: pacienteId }).then(() => carregar());
    // Alertas e doses chegam em tempo real (o Realtime respeita o RLS).
    const canal = supabase
      .channel(`painel-${pacienteId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alertas', filter: `paciente_id=eq.${pacienteId}` }, carregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'doses', filter: `paciente_id=eq.${pacienteId}` }, carregar)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'checkins', filter: `paciente_id=eq.${pacienteId}` }, carregar)
      .subscribe();
    // Plano B se o Realtime cair: atualiza a cada minuto.
    const timer = setInterval(carregar, 60_000);
    return () => {
      clearInterval(timer);
      supabase.removeChannel(canal);
    };
  }, [pacienteId, carregar]);

  // Ao voltar de Remédios ou Vincular, atualiza o painel.
  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  async function confirmarPelaFamilia(id: string) {
    const { error } = await supabase.rpc('confirmar_dose', { p_dose: id });
    if (error) setErro(error.message);
    carregar();
  }

  const { vista } = useLocalSearchParams<{ vista?: string }>();
  const [alertaAberto, setAlertaAberto] = useState<string | null>(null);

  const nome = paciente?.apelido || paciente?.nome || '';
  const urgentes = alertas.filter((a) => !a.visto_em && a.nivel === 'vermelho');
  const abertos = alertas.filter((a) => !a.visto_em && a.nivel !== 'vermelho');
  const naoVistos = alertas.filter((a) => !a.visto_em && a.nivel !== 'informativo').length;
  useAvisoUrgente(urgentes, nome);

  const aberto = alertas.find((a) => a.id === alertaAberto);
  if (aberto && paciente) {
    return (
      <TelaAlerta
        alerta={aberto}
        paciente={paciente}
        usuarioId={sessao?.user.id}
        ultimoCheckin={ultimoCheckin}
        onVoltar={() => setAlertaAberto(null)}
        onAtualizar={carregar}
      />
    );
  }

  const tomadas = doses.filter((d) => d.confirmado_em).length;
  const proximaId = doses.find((d) => !d.confirmado_em && Date.parse(d.previsto_em) > agora.getTime())?.id;
  const [prefixoUso, valorUso] = haQuantoTempo(ultimaInteracao, agora);
  const emAlertas = vista === 'alertas';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={estilos.cabecalho}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={estilos.ola}>{emAlertas ? 'Alertas' : 'Olá!'}</Text>
            <TituloPagina>{emAlertas ? `Avisos de ${nome}` : `${nome} hoje`}</TituloPagina>
          </View>
          <Avatar nome={nome} />
        </View>

        <Erro mensagem={erro} />

        {urgentes.map((a) => (
          <CartaoUrgente key={a.id} alerta={a} onAbrir={() => setAlertaAberto(a.id)} />
        ))}

        <CartaoNotificacoes soQuandoFaltar />

        {emAlertas ? (
          <Cartao style={{ paddingBottom: 8, gap: 0 }}>
            <Titulo>Últimos alertas</Titulo>
            {alertas.length === 0 && <Texto suave style={{ paddingVertical: 10 }}>Nenhum alerta ainda.</Texto>}
            {alertas.map((a, i) => (
              <View key={a.id}>
                {i > 0 && <Divisor />}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${NIVEL[a.nivel]}: ${a.motivo}`}
                  onPress={() => setAlertaAberto(a.id)}
                  style={estilos.linhaAlerta}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[estilos.linhaTexto, !a.visto_em && { fontFamily: fontes.textoNegrito }]} numberOfLines={2}>
                      {a.motivo}
                    </Text>
                    <Text style={estilos.hora}>{horaCurta(a.criado_em)} · {a.visto_em ? 'visto' : 'não visto'}</Text>
                  </View>
                  <Selo
                    texto={NIVEL[a.nivel]}
                    cor={a.nivel === 'vermelho' ? paleta.sobreTinta : a.nivel === 'informativo' ? paleta.textoSuave : paleta.alerta.texto}
                    fundo={a.nivel === 'vermelho' ? paleta.alerta.forte : a.nivel === 'informativo' ? paleta.superficieNeutra : paleta.alerta.fundo}
                  />
                </Pressable>
              </View>
            ))}
          </Cartao>
        ) : (
          <>
            <View style={estilos.resumo}>
              <View style={[estilos.blocoResumo, { backgroundColor: paleta.salvia.fundo }]}>
                <Text style={[estilos.rotuloResumo, { color: paleta.salvia.texto }]}>Remédios tomados</Text>
                <Text style={estilos.numero}>
                  {tomadas}
                  <Text style={[estilos.numeroMenor, { color: paleta.salvia.texto }]}> / {doses.length}</Text>
                </Text>
              </View>
              <View style={[estilos.blocoResumo, { backgroundColor: paleta.lilas.fundo }]}>
                <Text style={[estilos.rotuloResumo, { color: paleta.lilas.texto }]}>Último uso</Text>
                <Text style={estilos.numero}>
                  <Text style={[estilos.numeroMenor, { color: paleta.lilas.texto }]}>{prefixoUso}</Text>
                  {valorUso}
                </Text>
              </View>
            </View>

            {paciente ? <CartaoConsentimento paciente={paciente} papel={papel} /> : null}

            {!paciente?.usuario_id && (
              <Cartao>
                <Texto>O celular de {nome} ainda não está conectado.</Texto>
                <Botao variante="secundario" titulo="Conectar o celular" onPress={() => router.push('/vincular')} />
              </Cartao>
            )}

            {abertos.map((a) => (
              <Pressable
                key={a.id}
                accessibilityRole="button"
                accessibilityLabel={`${NIVEL[a.nivel]}: ${a.motivo}`}
                onPress={() => setAlertaAberto(a.id)}
                style={estilos.aviso}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={estilos.rotuloAviso}>{NIVEL[a.nivel].toUpperCase()} · {horaCurta(a.criado_em)}</Text>
                  <Text style={estilos.textoAviso}>{a.motivo}</Text>
                </View>
              </Pressable>
            ))}

            <Cartao style={{ paddingBottom: 8, gap: 0 }}>
              <Titulo>Remédios de hoje</Titulo>
              {doses.length === 0 && (
                <Texto suave style={{ paddingVertical: 10 }}>
                  Nenhuma dose hoje. Cadastre os remédios e horários.
                </Texto>
              )}
              {doses.map((d, i) => {
                const proximo = d.id === proximaId;
                const s = proximo ? PROXIMO : SITUACAO[situacaoDose(d, agora, temposDoPaciente(paciente))];
                const pendenteVencida = !d.confirmado_em && Date.parse(d.previsto_em) <= agora.getTime();
                return (
                  <View key={d.id}>
                    {i > 0 && <Divisor />}
                    <View style={estilos.linhaDose}>
                      <Text style={[estilos.hora, proximo && estilos.forte]}>{horaCurta(d.previsto_em)}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[estilos.linhaTexto, proximo && estilos.forte]}>
                          {d.horarios.remedios.nome}
                          {d.horarios.remedios.critico ? ' · crítico' : ''}
                        </Text>
                        {pendenteVencida && (
                          <Pressable onPress={() => confirmarPelaFamilia(d.id)} accessibilityRole="button" hitSlop={8}>
                            <Text style={estilos.link}>Marcar tomado</Text>
                          </Pressable>
                        )}
                      </View>
                      <Selo texto={d.confirmado_em ? `Tomou ${horaCurta(d.confirmado_em)}` : s.texto} cor={s.cor} fundo={s.fundo} />
                    </View>
                  </View>
                );
              })}
            </Cartao>

            <CartaoUltimoCheckin ultimo={ultimoCheckin} agora={agora} />
          </>
        )}
      </ScrollView>
      <BarraNavegacao ativa={emAlertas ? 'alertas' : 'hoje'} alertasNovos={naoVistos} />
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
  cabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, gap: 12 },
  ola: { fontFamily: fontes.texto, fontSize: 15, color: paleta.textoSuave },
  resumo: { flexDirection: 'row', gap: 12 },
  blocoResumo: { flex: 1, borderRadius: 26, paddingVertical: 14, paddingHorizontal: 16, gap: 4 },
  rotuloResumo: { fontFamily: fontes.texto, fontSize: 15 },
  numero: { fontFamily: fontes.destaque, fontSize: 34, lineHeight: 38, color: paleta.tinta },
  numeroMenor: { fontSize: 22 },
  aviso: { backgroundColor: paleta.alerta.fundo, borderRadius: 26, paddingVertical: 14, paddingHorizontal: 18 },
  rotuloAviso: { fontFamily: fontes.textoNegrito, fontSize: 13, letterSpacing: 0.78, color: paleta.alerta.texto },
  textoAviso: { fontFamily: fontes.destaque, fontSize: 18, lineHeight: 23, color: paleta.alerta.escuro },
  linhaDose: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 6 },
  linhaAlerta: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8 },
  hora: { width: 46, fontFamily: fontes.texto, fontSize: 15, color: paleta.textoSuave },
  linhaTexto: { fontFamily: fontes.texto, fontSize: 16, color: paleta.tinta },
  forte: { fontFamily: fontes.textoNegrito, color: paleta.tinta },
  link: { fontFamily: fontes.textoNegrito, fontSize: 14, color: paleta.tinta, textDecorationLine: 'underline', paddingTop: 2 },
});

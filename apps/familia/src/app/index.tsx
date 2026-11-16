import {
  horaCurta,
  NIVEIS,
  SELECT_DOSE,
  situacaoDose,
  type AlertaLinha,
  type DoseComRemedio,
  type SituacaoDose,
} from '@cuida/cliente';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CadastroPaciente } from '@/components/cadastro-paciente';
import { Botao, Cartao, cores, Erro, Selo, Texto, Titulo } from '@/components/ui';
import { usePaciente } from '@/lib/paciente';
import { useSessao } from '@/lib/sessao';
import { supabase } from '@/lib/supabase';

const SITUACAO: Record<SituacaoDose, { texto: string; cor: string; fundo: string }> = {
  tomada: { texto: 'Tomou', cor: cores.sucesso, fundo: '#E3F4EC' },
  perdida: { texto: 'Não confirmou', cor: NIVEIS.vermelho.cor, fundo: NIVEIS.vermelho.fundo },
  atrasada: { texto: 'Atrasada', cor: NIVEIS.laranja.cor, fundo: NIVEIS.laranja.fundo },
  agora: { texto: 'Alarme tocando', cor: NIVEIS.amarelo.cor, fundo: NIVEIS.amarelo.fundo },
  futura: { texto: 'Mais tarde', cor: cores.suave, fundo: '#EEF2F6' },
};

/** Início e fim do dia de hoje no horário de Brasília (sem horário de verão). */
function limitesDeHoje(): [string, string] {
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  return [`${hoje}T00:00:00-03:00`, `${hoje}T23:59:59-03:00`];
}

function haQuantoTempo(iso: string | null, agora: Date): string {
  if (!iso) return 'nunca';
  const min = Math.round((agora.getTime() - Date.parse(iso)) / 60_000);
  if (min < 1) return 'agora há pouco';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} dia(s)`;
}

export default function Painel() {
  const { paciente, carregando, erro } = usePaciente();

  if (carregando) {
    return <ActivityIndicator style={{ marginTop: 48 }} size="large" color={cores.primaria} />;
  }
  return (
    <ScrollView contentContainerStyle={estilos.conteudo}>
      <Erro mensagem={erro} />
      {paciente ? <PainelDoDia pacienteId={paciente.id} /> : <CadastroPaciente />}
      <BotaoSair />
    </ScrollView>
  );
}

function PainelDoDia({ pacienteId }: { pacienteId: string }) {
  const { paciente } = usePaciente();
  const { sessao } = useSessao();
  const [doses, setDoses] = useState<DoseComRemedio[]>([]);
  const [alertas, setAlertas] = useState<AlertaLinha[]>([]);
  const [ultimaInteracao, setUltimaInteracao] = useState<string | null>(paciente?.ultima_interacao_em ?? null);
  const [agora, setAgora] = useState(new Date());
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const [inicio, fim] = limitesDeHoje();
    const [d, a, p] = await Promise.all([
      supabase
        .from('doses')
        .select(SELECT_DOSE)
        .eq('paciente_id', pacienteId)
        .gte('previsto_em', inicio)
        .lte('previsto_em', fim)
        .order('previsto_em'),
      supabase
        .from('alertas')
        .select('id, paciente_id, gatilho, nivel, motivo, criado_em, visto_em')
        .eq('paciente_id', pacienteId)
        .order('criado_em', { ascending: false })
        .limit(20),
      supabase.from('pacientes').select('ultima_interacao_em').eq('id', pacienteId).single(),
    ]);
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

  async function marcarVisto(id: string) {
    await supabase
      .from('alertas')
      .update({ visto_em: new Date().toISOString(), visto_por: sessao?.user.id })
      .eq('id', id);
    carregar();
  }

  async function confirmarPelaFamilia(id: string) {
    const { error } = await supabase.rpc('confirmar_dose', { p_dose: id });
    if (error) setErro(error.message);
    carregar();
  }

  const abertos = alertas.filter((a) => !a.visto_em);
  const vistos = alertas.filter((a) => a.visto_em).slice(0, 5);
  const nome = paciente?.apelido || paciente?.nome;

  return (
    <View style={{ gap: 16 }}>
      <Cartao>
        <Text style={estilos.nome}>{nome}</Text>
        <Texto suave>Última vez que usou o app: {haQuantoTempo(ultimaInteracao, agora)}</Texto>
        {!paciente?.usuario_id && (
          <Texto>O celular de {nome} ainda não foi vinculado. Toque em “Vincular o celular”.</Texto>
        )}
      </Cartao>

      <Erro mensagem={erro} />

      {abertos.map((a) => (
        <Cartao key={a.id} style={{ borderColor: NIVEIS[a.nivel].cor, borderWidth: 2, backgroundColor: NIVEIS[a.nivel].fundo }}>
          <Selo texto={NIVEIS[a.nivel].rotulo} cor={NIVEIS[a.nivel].cor} fundo="#fff" />
          <Text style={[estilos.motivo, { color: NIVEIS[a.nivel].cor }]}>{a.motivo}</Text>
          <Texto suave>{horaCurta(a.criado_em)} · {haQuantoTempo(a.criado_em, agora)}</Texto>
          <Botao titulo="Vi, estou cuidando" onPress={() => marcarVisto(a.id)} />
        </Cartao>
      ))}

      <Cartao>
        <Titulo>Remédios de hoje</Titulo>
        {doses.length === 0 && <Texto suave>Nenhuma dose hoje. Cadastre os remédios e horários.</Texto>}
        {doses.map((d) => {
          const s = SITUACAO[situacaoDose(d, agora)];
          return (
            <View key={d.id} style={estilos.linhaDose}>
              <Text style={estilos.hora}>{horaCurta(d.previsto_em)}</Text>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={estilos.remedio}>
                  {d.horarios.remedios.nome}
                  {d.horarios.remedios.critico ? ' · crítico' : ''}
                </Text>
                <Texto suave>{d.horarios.remedios.dose}</Texto>
                <Selo texto={d.confirmado_em ? `Tomou às ${horaCurta(d.confirmado_em)}` : s.texto} cor={s.cor} fundo={s.fundo} />
              </View>
              {!d.confirmado_em && Date.parse(d.previsto_em) <= agora.getTime() && (
                <Pressable onPress={() => confirmarPelaFamilia(d.id)} accessibilityRole="button">
                  <Text style={estilos.link}>Marcar tomado</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </Cartao>

      <View style={{ gap: 10 }}>
        <Botao titulo="Remédios e horários" onPress={() => router.push('/remedios')} />
        <Botao variante="secundario" titulo="Vincular o celular" onPress={() => router.push('/vincular')} />
      </View>

      {vistos.length > 0 && (
        <Cartao>
          <Titulo>Alertas recentes</Titulo>
          {vistos.map((a) => (
            <View key={a.id} style={{ gap: 2 }}>
              <Text style={{ color: NIVEIS[a.nivel].cor, fontWeight: '700' }}>{NIVEIS[a.nivel].rotulo}</Text>
              <Texto>{a.motivo}</Texto>
              <Texto suave>{haQuantoTempo(a.criado_em, agora)} · visto</Texto>
            </View>
          ))}
        </Cartao>
      )}
    </View>
  );
}

function BotaoSair() {
  return <Botao variante="secundario" titulo="Sair" onPress={() => supabase.auth.signOut()} />;
}

const estilos = StyleSheet.create({
  conteudo: { padding: 16, gap: 16, maxWidth: 640, width: '100%', alignSelf: 'center', paddingBottom: 48 },
  nome: { fontSize: 24, fontWeight: '800', color: cores.texto },
  motivo: { fontSize: 18, fontWeight: '700' },
  linhaDose: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: cores.borda,
  },
  hora: { fontSize: 18, fontWeight: '800', color: cores.texto, width: 56 },
  remedio: { fontSize: 16, fontWeight: '700', color: cores.texto },
  link: { color: cores.primaria, fontWeight: '700', fontSize: 15, paddingVertical: 4 },
});

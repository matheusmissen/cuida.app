// Alerta vermelho na família (referências: docs/design/telas/Familia-Painel.dc.html e
// Familia-Alerta.dc.html). Cartão vermelho no topo do painel e tela do alerta.
// Som (web) ou vibração (celular) na chegada e título da aba piscando até marcar como visto.
import { dividirMotivo, horaCurta, resumoDoCheckin, type AlertaLinha, type CheckinLinha } from '@cuida/cliente';
import { useEffect, useRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconeCheck, IconePessoas, IconeSetaDireita, IconeSetaEsquerda } from '@/components/icones';
import { Botao, Cartao, Selo, Texto, Titulo } from '@/components/ui';
import { espacos, fontes, paleta, raios, sombras } from '@/lib/tema';

function bipe() {
  try {
    const Ctx = (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach((inicio) => {
      const osc = ctx.createOscillator();
      const ganho = ctx.createGain();
      osc.frequency.value = 880;
      ganho.gain.value = 0.15;
      osc.connect(ganho).connect(ctx.destination);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + 0.2);
    });
  } catch {
    // navegador sem áudio liberado: o cartão vermelho continua na tela
  }
}

/** Som/vibração para alertas que chegam com a tela aberta e título da aba piscando. */
export function useAvisoUrgente(alertas: AlertaLinha[], nomePaciente: string) {
  const conhecidos = useRef<Set<string> | null>(null);

  useEffect(() => {
    const ids = new Set(alertas.map((a) => a.id));
    if (conhecidos.current) {
      const novo = alertas.some((a) => !conhecidos.current!.has(a.id));
      if (novo) {
        if (Platform.OS === 'web') bipe();
        else Vibration.vibrate([0, 600, 300, 600, 300, 600]);
      }
    }
    conhecidos.current = ids;
  }, [alertas]);

  useEffect(() => {
    if (Platform.OS !== 'web' || alertas.length === 0) return;
    const original = document.title;
    let alterna = false;
    const timer = setInterval(() => {
      alterna = !alterna;
      document.title = alterna ? `🔴 URGENTE — ${nomePaciente}` : original;
    }, 1000);
    return () => {
      clearInterval(timer);
      document.title = original;
    };
  }, [alertas.length, nomePaciente]);
}

/** Cartão vermelho do topo do painel. */
export function CartaoUrgente({ alerta, onAbrir }: { alerta: AlertaLinha; onAbrir: () => void }) {
  const { titulo } = dividirMotivo(alerta.motivo);
  return (
    <View style={estilos.cartaoUrgente} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <View style={estilos.linhaUrgente}>
        <View style={estilos.pontoBranco} />
        <Text style={estilos.rotuloUrgente}>URGENTE · {horaCurta(alerta.criado_em)}</Text>
      </View>
      <Text style={estilos.tituloUrgente}>{titulo}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ver alerta"
        onPress={onAbrir}
        style={({ pressed }) => [estilos.verAlerta, pressed && { opacity: 0.85 }]}
      >
        <Text style={estilos.textoVerAlerta}>Ver alerta</Text>
        <IconeSetaDireita tamanho={18} cor={paleta.alerta.texto} traco={2.4} />
      </Pressable>
    </View>
  );
}

/** Tela do alerta, com os dados que o painel já tem (motivo, hora e último check-in). */
export function TelaAlerta({
  alerta,
  nomePaciente,
  ultimoCheckin,
  onVoltar,
  onVisto,
}: {
  alerta: AlertaLinha;
  nomePaciente: string;
  ultimoCheckin: CheckinLinha | null;
  onVoltar: () => void;
  onVisto: (id: string) => void;
}) {
  const { titulo, detalhe } = dividirMotivo(alerta.motivo);
  const vermelho = alerta.nivel === 'vermelho';
  // Check-in até 3 h antes do alerta ajuda a entender o que aconteceu.
  const checkin =
    ultimoCheckin && Math.abs(Date.parse(alerta.criado_em) - Date.parse(ultimoCheckin.feito_em)) < 3 * 3_600_000
      ? ultimoCheckin
      : null;
  const resumo = checkin ? resumoDoCheckin(checkin) : [];
  const hoje =
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(alerta.criado_em)) ===
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: paleta.fundo }}>
      <ScrollView contentContainerStyle={estilos.tela}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar ao início"
          onPress={onVoltar}
          style={({ pressed }) => [estilos.voltar, pressed && { opacity: 0.8 }]}
        >
          <IconeSetaEsquerda tamanho={20} traco={2.2} cor={paleta.tinta} />
          <Text style={estilos.textoVoltar}>Início</Text>
        </Pressable>

        <View style={[estilos.cabecalho, !vermelho && { backgroundColor: paleta.superficieNeutra }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[estilos.seloUrgente, !vermelho && { backgroundColor: paleta.tinta }]}>
              <Text style={estilos.textoSeloUrgente}>{vermelho ? 'URGENTE' : alerta.nivel === 'laranja' ? 'ATENÇÃO' : 'ACOMPANHAR'}</Text>
            </View>
            <Text style={[estilos.quando, !vermelho && { color: paleta.textoSecundario }]}>
              {hoje ? 'Hoje' : new Date(alerta.criado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })},{' '}
              {horaCurta(alerta.criado_em)}
            </Text>
          </View>
          <Text style={[estilos.tituloAlerta, !vermelho && { color: paleta.tinta }]} accessibilityRole="header">
            {titulo}
          </Text>
          {detalhe && <Text style={[estilos.detalhe, !vermelho && { color: paleta.textoSecundario }]}>{detalhe}</Text>}
        </View>

        {checkin && (
          <Cartao style={{ gap: 6, paddingHorizontal: 20 }}>
            <Texto suave>O que {nomePaciente} contou à Lia · {horaCurta(checkin.feito_em)}</Texto>
            {checkin.notas ? <Text style={estilos.fala}>{checkin.notas}</Text> : null}
            {resumo.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {resumo.map((r) => (
                  <Selo key={r} texto={r} cor={paleta.alerta.texto} fundo={paleta.alerta.fundo} />
                ))}
              </View>
            )}
            {checkin.sono ? <Texto suave>Sono: {checkin.sono}</Texto> : null}
          </Cartao>
        )}

        <Cartao style={{ paddingHorizontal: 20 }}>
          <Titulo>Quem foi avisado</Titulo>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={estilos.avatar}>
              <IconePessoas tamanho={20} cor={paleta.lilas.texto} />
            </View>
            <Texto style={{ flex: 1, fontSize: 16 }}>
              {vermelho ? 'Todo o círculo de cuidado, na hora' : alerta.nivel === 'laranja' ? 'O responsável principal (e o próximo da escala após 30 min)' : 'Vai no resumo do dia'}
            </Texto>
          </View>
          {alerta.visto_em && <Selo texto={`Visto às ${horaCurta(alerta.visto_em)}`} cor={paleta.salvia.texto} fundo={paleta.salvia.fundo} />}
        </Cartao>

        <View style={{ flexGrow: 1, minHeight: 16 }} />
        {!alerta.visto_em && (
          <Botao
            titulo="Marcar como visto"
            icone={<IconeCheck tamanho={20} cor={paleta.sobreTinta} traco={2.4} />}
            onPress={() => onVisto(alerta.id)}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  cartaoUrgente: {
    backgroundColor: paleta.alerta.forte,
    borderRadius: 30,
    paddingVertical: 18,
    paddingLeft: 20,
    paddingRight: 18,
    gap: 6,
    boxShadow: sombras.alerta,
  },
  linhaUrgente: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pontoBranco: { width: 8, height: 8, borderRadius: 4, backgroundColor: paleta.sobreTinta },
  rotuloUrgente: { fontFamily: fontes.textoNegrito, fontSize: 14, letterSpacing: 0.84, color: paleta.sobreTinta },
  tituloUrgente: { fontFamily: fontes.destaque, fontSize: 22, lineHeight: 26, color: paleta.sobreTinta },
  verAlerta: {
    alignSelf: 'flex-start',
    marginTop: 6,
    height: 44,
    backgroundColor: paleta.cartao,
    borderRadius: 22,
    paddingLeft: 18,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  textoVerAlerta: { fontFamily: fontes.textoNegrito, fontSize: 16, color: paleta.alerta.texto },
  tela: {
    flexGrow: 1,
    padding: espacos.margemTelaFamilia,
    paddingTop: 24,
    gap: 12,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  voltar: {
    alignSelf: 'flex-start',
    height: 48,
    backgroundColor: paleta.cartao,
    borderRadius: 24,
    paddingLeft: 12,
    paddingRight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    boxShadow: sombras.cartao,
  },
  textoVoltar: { fontFamily: fontes.textoNegrito, fontSize: 15, color: paleta.tinta },
  cabecalho: { backgroundColor: paleta.alerta.fundo, borderRadius: raios.cartao, paddingTop: 20, paddingHorizontal: 22, paddingBottom: 22, gap: 10 },
  seloUrgente: { backgroundColor: paleta.alerta.forte, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  textoSeloUrgente: { fontFamily: fontes.textoNegrito, fontSize: 13, letterSpacing: 0.78, color: paleta.sobreTinta },
  quando: { fontFamily: fontes.texto, fontSize: 15, color: paleta.alerta.escuro },
  tituloAlerta: { fontFamily: fontes.destaque, fontSize: 36, lineHeight: 40, letterSpacing: -0.36, color: paleta.alerta.escuro },
  detalhe: { fontFamily: fontes.texto, fontSize: 16, lineHeight: 23, color: paleta.alerta.escuro },
  fala: { fontFamily: fontes.destaque, fontSize: 24, lineHeight: 30, color: paleta.tinta },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: paleta.lilas.fundo,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

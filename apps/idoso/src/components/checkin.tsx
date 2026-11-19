// Tela 4 do idoso: check-in diário "Como você está hoje?" (docs/PRD.md, seções 4 e 10;
// visual da Variação E, docs/design.md). Aparece antes de qualquer outra tela até o check-in do dia.
// Os 6 níveis continuam os mesmos, mas em dois passos curtos, com botões grandes de largura inteira:
//   1. três opções: Bem, Mais ou menos, Mal;
//   2. a mais perto entre duas (Muito bem/Bem, Mais ou menos/Não muito bem, Mal/Muito mal).
// Depois de escolher, a resposta fica 5 segundos com "Mudar resposta" antes de ser guardada (um dedo
// trêmulo não vira alerta). O alarme de remédio continua por cima, e "Preciso de ajuda" fica no rodapé fixo.
import type { NivelCheckin } from '@cuida/regras';
import {
  BotaoPrincipal,
  BotaoSecundario,
  cores,
  espacos,
  fontes,
  Paisagem,
  paisagem,
  rostinhos,
  SeloRostinho,
  usePeriodo,
  type NivelRostinho,
} from '@cuida/visual';
import { dataCurta } from '@cuida/cliente';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RodapeAjuda } from '@/components/botao-ajuda';
import { falar } from '@/lib/voz';

/** Segundos que a resposta espera antes de ser guardada sozinha. */
export const SEGUNDOS_PARA_GUARDAR = 5;

/** Passo 1: cada grupo mostra o rostinho do meio. */
const GRUPOS: NivelRostinho[] = [2, 3, 5];
/** Passo 2: as duas opções de cada grupo (do melhor para o pior). */
const DETALHE: Record<number, [NivelRostinho, NivelRostinho]> = { 2: [1, 2], 3: [3, 4], 5: [5, 6] };

type Fase = { passo: 'grupo' } | { passo: 'detalhe'; grupo: NivelRostinho } | { passo: 'confirmar'; nivel: NivelRostinho };

export function TelaCheckin({
  agora,
  enviando,
  erro,
  onEscolher,
  botaoAjuda,
}: {
  agora: Date;
  /** Nível sendo guardado (só para compatibilidade; a tela já mostra a escolha). */
  escolhido?: NivelCheckin | null;
  enviando: boolean;
  erro: string | null;
  onEscolher: (nivel: NivelCheckin) => void;
  botaoAjuda: ReactNode;
}) {
  const periodo = usePeriodo();
  const [fase, setFase] = useState<Fase>({ passo: 'grupo' });
  const [restam, setRestam] = useState(SEGUNDOS_PARA_GUARDAR);
  const enviado = useRef(false);

  const guardar = (nivel: NivelRostinho) => {
    enviado.current = true;
    onEscolher(nivel as NivelCheckin);
  };

  // Contagem do "Mudar resposta": ao chegar a zero, guarda sozinho (uma vez).
  useEffect(() => {
    if (fase.passo !== 'confirmar' || enviado.current) return;
    if (restam <= 0) {
      guardar(fase.nivel);
      return;
    }
    const id = setTimeout(() => setRestam((r) => r - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, restam]);

  const escolherGrupo = (grupo: NivelRostinho) => {
    setFase({ passo: 'detalhe', grupo });
    falar('Qual fica mais perto?');
  };

  const escolherNivel = (nivel: NivelRostinho) => {
    enviado.current = false;
    setRestam(SEGUNDOS_PARA_GUARDAR);
    setFase({ passo: 'confirmar', nivel });
    falar(`Você escolheu: ${rostinhos[nivel].rotulo}.`);
  };

  const mudar = () => {
    if (enviando) return;
    enviado.current = false;
    setFase({ passo: 'grupo' });
  };

  let titulo = 'Toque no que mostra como você se sente.';
  let miolo: ReactNode;
  if (fase.passo === 'grupo') {
    miolo = (
      <View style={estilos.lista} accessibilityRole="radiogroup" aria-label="Como você está hoje?">
        {GRUPOS.map((n) => (
          <OpcaoRostinho key={n} nivel={n} onPress={() => escolherGrupo(n)} />
        ))}
      </View>
    );
  } else if (fase.passo === 'detalhe') {
    titulo = 'Qual fica mais perto?';
    miolo = (
      <>
        <View style={estilos.lista} accessibilityRole="radiogroup" aria-label="Qual fica mais perto?">
          {DETALHE[fase.grupo].map((n) => (
            <OpcaoRostinho key={n} nivel={n} onPress={() => escolherNivel(n)} />
          ))}
        </View>
        <BotaoSecundario rotulo="Voltar" onPress={() => setFase({ passo: 'grupo' })} />
      </>
    );
  } else {
    const r = rostinhos[fase.nivel];
    titulo = `Você escolheu: ${r.rotulo}`;
    const aguardando = !enviado.current && !enviando;
    miolo = (
      <>
        <OpcaoRostinho nivel={fase.nivel} selecionado />
        {enviando ? (
          <View style={estilos.linha} accessibilityLiveRegion="polite">
            <ActivityIndicator color={cores.primaria} />
            <Text style={estilos.texto}>Guardando…</Text>
          </View>
        ) : aguardando ? (
          <Text style={estilos.textoSuave} accessibilityLiveRegion="polite">
            Guardo sozinho em {restam} {restam === 1 ? 'segundo' : 'segundos'}.
          </Text>
        ) : null}
        {erro ? (
          <Text style={estilos.erro} accessibilityLiveRegion="assertive">
            {erro}
          </Text>
        ) : null}
        <BotaoPrincipal
          rotulo={erro ? 'Tentar de novo' : 'Está certo'}
          onPress={() => guardar(fase.nivel)}
          desabilitado={enviando || (enviado.current && !erro)}
        />
        <BotaoSecundario rotulo="Mudar resposta" onPress={mudar} desabilitado={enviando} />
      </>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['bottom']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 28, flexGrow: 1 }}>
        <Paisagem altura={190}>
          <Text style={[estilos.data, { color: paisagem[periodo].texto }]}>{dataCurta(agora)}</Text>
          <Text style={[estilos.titulo, { color: paisagem[periodo].texto }]} accessibilityRole="header">
            Como você está hoje?
          </Text>
        </Paisagem>
        <View style={estilos.miolo}>
          <Text style={estilos.texto} accessibilityLiveRegion="polite">
            {titulo}
          </Text>
          {miolo}
        </View>
      </ScrollView>
      <RodapeAjuda>{botaoAjuda}</RodapeAjuda>
    </SafeAreaView>
  );
}

/** Uma opção em largura inteira: rostinho de 80 px e o rótulo escrito grande. */
function OpcaoRostinho({ nivel, selecionado, onPress }: { nivel: NivelRostinho; selecionado?: boolean; onPress?: () => void }) {
  const r = rostinhos[nivel];
  const conteudo = (
    <>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <SeloRostinho nivel={nivel} tamanho={80} />
      </View>
      <Text style={estilos.rotulo}>{r.rotulo}</Text>
    </>
  );
  if (!onPress) {
    return <View style={[estilos.opcao, selecionado && estilos.opcaoSelecionada]}>{conteudo}</View>;
  }
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={r.rotulo}
      accessibilityState={{ checked: !!selecionado }}
      onPress={onPress}
      style={({ pressed }) => [estilos.opcao, selecionado && estilos.opcaoSelecionada, pressed && { opacity: 0.85 }]}
    >
      {conteudo}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  miolo: {
    flexGrow: 1,
    padding: espacos.lateral,
    paddingTop: 22,
    gap: 18,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  data: { fontFamily: fontes.texto, fontSize: 20 },
  titulo: { fontFamily: fontes.titulo, fontSize: 32, lineHeight: 38 },
  texto: { fontFamily: fontes.texto, fontSize: 21, lineHeight: 29, color: cores.texto },
  textoSuave: { fontFamily: fontes.texto, fontSize: 20, lineHeight: 27, color: cores.textoSuave },
  erro: { fontFamily: fontes.textoNegrito, fontSize: 21, lineHeight: 28, color: cores.alertaTexto },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lista: { gap: 14 },
  opcao: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: cores.superficie,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: cores.borda,
  },
  opcaoSelecionada: { borderWidth: 2.5, borderColor: cores.primaria },
  rotulo: { flexShrink: 1, fontFamily: fontes.titulo, fontSize: 26, lineHeight: 32, color: cores.texto },
});

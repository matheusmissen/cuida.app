// Tela 4 do idoso: check-in diário "Como você está hoje?" com os 6 rostinhos (docs/PRD.md, seções 4 e 10;
// visual da Variação E, docs/design.md). Aparece antes de qualquer outra tela até o check-in do dia.
// O alarme de remédio continua por cima, e "Preciso de ajuda" fica sempre no fim.
import { dataCurta } from '@cuida/cliente';
import type { NivelCheckin } from '@cuida/regras';
import { cores, espacos, fontes, GradeRostinhos, Paisagem, paisagem, usePeriodo, type NivelRostinho } from '@cuida/visual';
import type { ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function TelaCheckin({
  agora,
  escolhido,
  enviando,
  erro,
  onEscolher,
  botaoAjuda,
}: {
  agora: Date;
  escolhido: NivelCheckin | null;
  enviando: boolean;
  erro: string | null;
  onEscolher: (nivel: NivelCheckin) => void;
  botaoAjuda: ReactNode;
}) {
  const periodo = usePeriodo();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 28, flexGrow: 1 }}>
        <Paisagem altura={190}>
          <Text style={[estilos.data, { color: paisagem[periodo].texto }]}>{dataCurta(agora)}</Text>
          <Text style={[estilos.titulo, { color: paisagem[periodo].texto }]} accessibilityRole="header">
            Como você está hoje?
          </Text>
        </Paisagem>
        <View style={estilos.miolo}>
          <Text style={estilos.texto}>Toque no rostinho que mostra como você se sente.</Text>
          <GradeRostinhos valor={escolhido} aoEscolher={(n: NivelRostinho) => !enviando && onEscolher(n)} />
          {enviando ? (
            <View style={estilos.linha} accessibilityLiveRegion="polite">
              <ActivityIndicator color={cores.primaria} />
              <Text style={estilos.texto}>Guardando…</Text>
            </View>
          ) : null}
          {erro ? (
            <Text style={estilos.erro} accessibilityLiveRegion="assertive">
              {erro}
            </Text>
          ) : null}
          <View style={{ flexGrow: 1 }} />
          {botaoAjuda}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  miolo: {
    flexGrow: 1,
    padding: espacos.lateral,
    paddingTop: 22,
    gap: 22,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  data: { fontFamily: fontes.texto, fontSize: 20 },
  titulo: { fontFamily: fontes.titulo, fontSize: 32, lineHeight: 38 },
  texto: { fontFamily: fontes.texto, fontSize: 21, lineHeight: 29, color: cores.texto },
  erro: { fontFamily: fontes.textoNegrito, fontSize: 21, lineHeight: 28, color: cores.alertaTexto },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});

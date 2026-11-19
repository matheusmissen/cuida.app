// Tela 3 do idoso: consentimento (docs/PRD.md, "Dados e LGPD" e seção 10; visual da Variação E).
// Uma tela simples, cada finalidade com o seu "Concordo"; nada vem marcado.
// Sem "guardar", a tela explica e pede de novo (o Cuida não funciona sem isso).
import {
  EXPLICACAO_REGISTRO,
  FINALIDADES,
  falaDoConsentimento,
  podeContinuar,
  SEM_ESCOLHAS,
  type Escolhas,
} from '@cuida/cliente';
import { BotaoPrincipal, BotaoSecundario, Cartao, cores, espacos, fontes, IconeConfirmado, Paisagem, paisagem, usePeriodo } from '@cuida/visual';
import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { falar } from '@/lib/voz';

export function TelaConsentimento({
  apelido,
  inicial = SEM_ESCOLHAS,
  titulo = 'Antes de começar',
  enviando,
  erro,
  onConfirmar,
  onVoltar,
  depois,
}: {
  apelido: string;
  inicial?: Escolhas;
  titulo?: string;
  enviando: boolean;
  erro: string | null;
  onConfirmar: (escolhas: Escolhas) => void;
  /** "Minha privacidade": voltar sem mudar nada. */
  onVoltar?: () => void;
  /** Conteúdo depois das permissões (em "Minha privacidade": quem acompanha). */
  depois?: ReactNode;
}) {
  const periodo = usePeriodo();
  const [escolhas, setEscolhas] = useState<Escolhas>(inicial);
  const [explicando, setExplicando] = useState(false);

  useEffect(() => {
    if (!onVoltar) falar(falaDoConsentimento(apelido));
  }, [apelido, onVoltar]);

  const continuar = () => {
    if (!podeContinuar(escolhas)) {
      setExplicando(true);
      falar(EXPLICACAO_REGISTRO);
      return;
    }
    onConfirmar(escolhas);
  };

  if (explicando) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}>
        <ScrollView contentContainerStyle={estilos.miolo}>
          <Text style={[estilos.titulo, { color: cores.texto, paddingTop: 24 }]} accessibilityRole="header">
            O Cuida precisa guardar
          </Text>
          <Cartao style={{ gap: 10 }}>
            <Text style={estilos.texto}>{EXPLICACAO_REGISTRO}</Text>
            <Text style={estilos.texto}>As informações ficam guardadas com segurança e não são vendidas para ninguém.</Text>
          </Cartao>
          <BotaoPrincipal
            rotulo="Concordo em guardar"
            onPress={() => {
              setEscolhas((e) => ({ ...e, registro: true }));
              setExplicando(false);
            }}
          />
          <BotaoSecundario rotulo="Falar com a família" onPress={() => setExplicando(false)} />
          <Text style={estilos.nota}>Se tiver dúvida, peça para alguém da sua família ler com você.</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Paisagem altura={160}>
          <Text style={[estilos.titulo, { color: paisagem[periodo].texto }]} accessibilityRole="header">
            {titulo}
          </Text>
        </Paisagem>
        <View style={estilos.miolo}>
          <Text style={estilos.texto}>
            O Cuida só usa as suas informações com a sua permissão. Toque em "Concordo" em cada uma que você aceitar.
          </Text>
          {FINALIDADES.map((f, i) => {
            const marcado = escolhas[f.codigo];
            return (
              <Cartao key={f.codigo} destaque={marcado} style={{ gap: 12 }}>
                <Text style={estilos.subtitulo}>
                  {i + 1}. {f.titulo}
                </Text>
                <Text style={estilos.texto}>{f.texto}</Text>
                {marcado ? (
                  <BotaoPrincipal
                    rotulo="Concordo"
                    icone={<IconeConfirmado cor={cores.sobrePrimaria} />}
                    onPress={() => setEscolhas((e) => ({ ...e, [f.codigo]: false }))}
                  />
                ) : (
                  <BotaoSecundario rotulo="Concordo" onPress={() => setEscolhas((e) => ({ ...e, [f.codigo]: true }))} />
                )}
              </Cartao>
            );
          })}
          {erro ? (
            <Text style={estilos.erro} accessibilityLiveRegion="assertive">
              {erro}
            </Text>
          ) : null}
          <BotaoPrincipal
            rotulo={enviando ? 'Guardando…' : onVoltar ? 'Guardar escolhas' : 'Continuar'}
            onPress={continuar}
            desabilitado={enviando}
          />
          {onVoltar ? <BotaoSecundario rotulo="Voltar sem mudar" onPress={onVoltar} /> : null}
          {onVoltar ? null : (
            <Text style={estilos.nota}>Você pode mudar de ideia quando quiser, em "Minha privacidade", no fim da tela inicial.</Text>
          )}
          {depois}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  miolo: { padding: espacos.lateral, gap: espacos.bloco, maxWidth: 640, width: '100%', alignSelf: 'center' },
  titulo: { fontFamily: fontes.titulo, fontSize: 32, lineHeight: 38 },
  subtitulo: { fontFamily: fontes.titulo, fontSize: 24, lineHeight: 30, color: cores.texto },
  texto: { fontFamily: fontes.texto, fontSize: 21, lineHeight: 29, color: cores.texto },
  nota: { fontFamily: fontes.texto, fontSize: 20, lineHeight: 27, color: cores.textoSuave },
  erro: { fontFamily: fontes.textoNegrito, fontSize: 21, lineHeight: 28, color: cores.alertaTexto },
});

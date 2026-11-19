// Tela 2 do idoso: primeiro acesso (docs/PRD.md, seção 3; visual da Variação E).
// No app instalado, o idoso digita o código de 4 números que aparece no app da família
// (passado por telefone ou pessoalmente). Sem senha: depois disso, fica conectado.
import { lerCodigoDeAcesso } from '@cuida/cliente';
import { BotaoPrincipal, cores, espacos, fontes, Paisagem, paisagem, usePeriodo } from '@cuida/visual';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, type TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAparelho } from '@/lib/aparelho';

export function PrimeiroAcesso() {
  const { vincular } = useAparelho();
  const periodo = usePeriodo();
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [focado, setFocado] = useState(false);
  const campo = useRef<TextInput>(null);

  async function entrar() {
    const lido = lerCodigoDeAcesso(codigo);
    if (!lido) {
      setErro(
        codigo.length < 4
          ? `Faltam ${4 - codigo.length} ${4 - codigo.length === 1 ? 'número' : 'números'}. O código tem 4 números.`
          : 'O código tem 4 números. Confira com a sua família.',
      );
      campo.current?.focus();
      return;
    }
    setErro(null);
    setEnviando(true);
    const falha = await vincular(lido);
    setEnviando(false);
    if (falha) {
      setErro(falha);
      setCodigo('');
      campo.current?.focus();
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <Paisagem altura={170}>
          <Text style={[estilos.titulo, { color: paisagem[periodo].texto }]} accessibilityRole="header">
            Vamos começar
          </Text>
        </Paisagem>
        <View style={estilos.miolo}>
          <Text style={estilos.texto}>
            Sua família vai te passar um código de 4 números pelo telefone. Digite aqui:
          </Text>
          {/* 4 caixinhas, como os códigos por SMS. O campo de verdade fica invisível por cima e recebe o toque. */}
          <View style={estilos.caixas}>
            {[0, 1, 2, 3].map((i) => {
              const digito = codigo[i];
              const atual = focado && i === Math.min(codigo.length, 3);
              return (
                <View
                  key={i}
                  style={[estilos.caixa, digito ? estilos.caixaCheia : null, atual ? estilos.caixaAtual : null]}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  {digito ? <Text style={estilos.digito}>{digito}</Text> : <View style={estilos.traco} />}
                </View>
              );
            })}
            <TextInput
              ref={campo}
              value={codigo}
              onChangeText={(t) => {
                setErro(null);
                setCodigo(t.replace(/\D/g, '').slice(0, 4));
              }}
              onSubmitEditing={entrar}
              onFocus={() => setFocado(true)}
              onBlur={() => setFocado(false)}
              keyboardType="number-pad"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              caretHidden
              accessibilityLabel={`Código de 4 números. ${codigo.length} de 4 digitados.`}
              style={estilos.campoInvisivel}
              autoFocus
            />
          </View>
          {erro ? (
            <Text style={estilos.erro} accessibilityLiveRegion="assertive">
              {erro}
            </Text>
          ) : null}
          <BotaoPrincipal rotulo={enviando ? 'Entrando…' : 'Entrar'} onPress={entrar} desabilitado={enviando} />
          <Text style={estilos.nota}>Não tem o código? Peça para a sua família abrir o Cuida Família e tocar em "Conectar o celular".</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  miolo: { padding: espacos.lateral, gap: espacos.bloco, maxWidth: 640, width: '100%', alignSelf: 'center' },
  titulo: { fontFamily: fontes.titulo, fontSize: 32, lineHeight: 38 },
  texto: { fontFamily: fontes.texto, fontSize: 21, lineHeight: 29, color: cores.texto },
  caixas: { flexDirection: 'row', justifyContent: 'center', gap: 12, position: 'relative' },
  caixa: {
    width: 68,
    height: 84,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: cores.bordaCampo,
    backgroundColor: cores.superficie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caixaCheia: { borderColor: cores.primaria },
  caixaAtual: { borderColor: cores.primaria, borderWidth: 3.5 },
  digito: { fontFamily: fontes.titulo, fontSize: 48, lineHeight: 56, color: cores.texto },
  // Tracinho vazio: mostra que falta um número sem parecer um número já digitado.
  traco: { width: 24, height: 4, borderRadius: 2, backgroundColor: cores.textoSuave },
  campoInvisivel: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
    color: 'transparent',
    fontSize: 16, // 16 ou mais: o Safari do iPhone não dá zoom ao focar
  } as unknown as TextStyle,
  erro: { fontFamily: fontes.textoNegrito, fontSize: 21, lineHeight: 28, color: cores.alertaTexto },
  nota: { fontFamily: fontes.texto, fontSize: 20, lineHeight: 27, color: cores.textoSuave },
});

// Tela 2 do idoso: primeiro acesso (docs/PRD.md, seção 3; visual da Variação E).
// No app instalado, o idoso digita o código de 4 números que aparece no app da família
// (passado por telefone ou pessoalmente). Sem senha: depois disso, fica conectado.
import { lerCodigoDeAcesso } from '@cuida/cliente';
import { BotaoPrincipal, Cartao, cores, espacos, fontes, Paisagem, paisagem, usePeriodo } from '@cuida/visual';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, type TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAparelho } from '@/lib/aparelho';

export function PrimeiroAcesso() {
  const { vincular } = useAparelho();
  const periodo = usePeriodo();
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar() {
    const lido = lerCodigoDeAcesso(codigo);
    if (!lido) return setErro('O código tem 4 números. Confira com a sua família.');
    setErro(null);
    setEnviando(true);
    const falha = await vincular(lido);
    setEnviando(false);
    if (falha) {
      setErro(falha);
      setCodigo('');
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
          <Cartao destaque style={{ alignItems: 'center', paddingVertical: 20 }}>
            <TextInput
              value={codigo}
              onChangeText={(t) => {
                setErro(null);
                setCodigo(t.replace(/\D/g, '').slice(0, 4));
              }}
              onSubmitEditing={entrar}
              keyboardType="number-pad"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              placeholder="0000"
              placeholderTextColor={cores.bordaCampo}
              accessibilityLabel="Código de 4 números"
              style={estilos.codigo}
              autoFocus
            />
          </Cartao>
          {erro ? (
            <Text style={estilos.erro} accessibilityLiveRegion="assertive">
              {erro}
            </Text>
          ) : null}
          <BotaoPrincipal rotulo={enviando ? 'Entrando…' : 'Entrar'} onPress={entrar} desabilitado={enviando || codigo.length < 4} />
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
  codigo: {
    fontFamily: fontes.titulo,
    fontSize: 56,
    letterSpacing: 18,
    color: cores.texto,
    textAlign: 'center',
    width: '100%',
    minHeight: 72,
    // No navegador, tira o contorno de foco que passava das bordas do cartão.
    outlineStyle: 'none',
    paddingLeft: 18, // compensa o espaço depois do último número
  } as unknown as TextStyle,
  erro: { fontFamily: fontes.textoNegrito, fontSize: 21, lineHeight: 28, color: cores.alertaTexto },
  nota: { fontFamily: fontes.texto, fontSize: 20, lineHeight: 27, color: cores.textoSuave },
});

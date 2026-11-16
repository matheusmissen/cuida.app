import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { BotaoPrincipal, BotaoSecundario, cartao, Destaque, Texto } from '@/components/ui';
import { useAparelho } from '@/lib/aparelho';
import { cores, espacos, fontes, tamanhos } from '@/lib/tema';
import { falar } from '@/lib/voz';
import { LeitorQr } from './leitor-qr';

/** Primeira abertura: liga este celular ao paciente com o código do app da família. */
export function VincularAparelho() {
  const { vincular } = useAparelho();
  const [codigo, setCodigo] = useState('');
  const [camera, setCamera] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(valor = codigo) {
    if (valor.length !== 6) {
      setErro('O código tem 6 números.');
      return;
    }
    setEnviando(true);
    setErro(null);
    const problema = await vincular(valor);
    setEnviando(false);
    if (problema) {
      setErro(problema);
      setCamera(false);
      falar(problema);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        <Destaque tamanho={tamanhos.titulo} accessibilityRole="header">
          {'Olá! Vamos\ncomeçar.'}
        </Destaque>
        <Texto cor={cores.textoSecundario} style={{ lineHeight: 31 }}>
          Peça para alguém da sua família abrir o app{' '}
          <Texto peso="negrito">Cuida Família</Texto> e mostrar o código.
        </Texto>
        {camera ? (
          <LeitorQr
            onCodigo={(c) => {
              setCodigo(c);
              enviar(c);
            }}
            onFechar={() => setCamera(false)}
          />
        ) : (
          <View style={{ gap: 16 }}>
            <TextInput
              value={codigo}
              onChangeText={(t) => setCodigo(t.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor={cores.textoSuave}
              accessibilityLabel="Código de 6 números"
              style={[cartao, estilos.campo]}
              onSubmitEditing={() => enviar()}
            />
            <BotaoPrincipal titulo={enviando ? 'Conectando…' : 'Entrar'} desativado={enviando} onPress={() => enviar()} />
            {Platform.OS !== 'web' && (
              <BotaoSecundario titulo="Ler o QR code com a câmera" onPress={() => setCamera(true)} />
            )}
          </View>
        )}
        {erro && (
          <View style={estilos.erro} accessibilityLiveRegion="assertive">
            <Texto peso="negrito" cor={cores.alerta.texto}>
              {erro}
            </Texto>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  conteudo: {
    padding: espacos.margemTela,
    gap: 24,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
    paddingTop: 48,
  },
  campo: {
    fontFamily: fontes.destaque,
    fontSize: 48,
    letterSpacing: 12,
    textAlign: 'center',
    paddingVertical: 16,
    color: cores.tinta,
    minHeight: 96,
  },
  erro: { backgroundColor: cores.alerta.fundo, borderRadius: 24, padding: 18 },
});

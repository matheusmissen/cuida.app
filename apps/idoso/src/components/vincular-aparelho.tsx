import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { useAparelho } from '@/lib/aparelho';
import { tema } from '@/lib/tema';
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
        <Text style={estilos.titulo}>Olá! Vamos começar.</Text>
        <Text style={estilos.texto}>
          Peça para alguém da sua família abrir o app <Text style={{ fontWeight: '800' }}>Cuida Família</Text> e
          mostrar o código.
        </Text>
        {camera ? (
          <LeitorQr
            onCodigo={(c) => {
              setCodigo(c);
              enviar(c);
            }}
            onFechar={() => setCamera(false)}
          />
        ) : (
          <>
            <TextInput
              value={codigo}
              onChangeText={(t) => setCodigo(t.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor="#999"
              accessibilityLabel="Código de 6 números"
              style={estilos.campo}
              onSubmitEditing={() => enviar()}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => enviar()}
              disabled={enviando}
              style={({ pressed }) => [estilos.botao, (pressed || enviando) && { opacity: 0.75 }]}
            >
              <Text style={estilos.textoBotao}>{enviando ? 'Conectando…' : 'Entrar'}</Text>
            </Pressable>
            {Platform.OS !== 'web' && (
              <Pressable accessibilityRole="button" onPress={() => setCamera(true)} style={estilos.secundario}>
                <Text style={estilos.textoSecundario}>Ler o QR code com a câmera</Text>
              </Pressable>
            )}
          </>
        )}
        {erro && <Text style={estilos.erro}>{erro}</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  conteudo: { padding: 24, gap: 24, maxWidth: 560, width: '100%', alignSelf: 'center', paddingTop: 48 },
  titulo: { fontSize: tema.letra.grande, fontWeight: '800', color: tema.texto },
  texto: { fontSize: tema.letra.minima, color: tema.texto, lineHeight: 32 },
  campo: {
    fontSize: tema.letra.enorme,
    letterSpacing: 12,
    textAlign: 'center',
    borderWidth: 3,
    borderColor: tema.texto,
    borderRadius: 16,
    paddingVertical: 16,
    color: tema.texto,
    minHeight: 96,
  },
  botao: {
    minHeight: 88,
    borderRadius: 20,
    backgroundColor: tema.primaria,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotao: { fontSize: tema.letra.grande, color: '#fff', fontWeight: '800' },
  secundario: {
    minHeight: tema.botaoMin,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: tema.primaria,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  textoSecundario: { fontSize: tema.letra.minima, color: tema.primaria, fontWeight: '800', textAlign: 'center' },
  erro: { fontSize: tema.letra.minima, color: tema.perigo, fontWeight: '700' },
});

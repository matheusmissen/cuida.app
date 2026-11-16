import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { Botao, Campo, Cartao, cores, Erro, Texto } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export default function Entrar() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [modo, setModo] = useState<'entrar' | 'criar'>('entrar');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function enviar() {
    setErro(null);
    setAviso(null);
    if (!email.includes('@') || senha.length < 6) {
      setErro('Informe um e-mail válido e uma senha com pelo menos 6 caracteres.');
      return;
    }
    setEnviando(true);
    const { data, error } =
      modo === 'entrar'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
        : await supabase.auth.signUp({ email: email.trim(), password: senha });
    setEnviando(false);
    if (error) {
      setErro(
        error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message,
      );
    } else if (modo === 'criar' && !data.session) {
      setAviso('Conta criada. Confirme pelo link que enviamos para o seu e-mail e depois entre.');
      setModo('entrar');
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        <Text style={estilos.marca}>Cuida Família</Text>
        <Texto suave>
          Cuide de quem mora sozinho: remédios, check-ins e alertas quando algo sai do normal.
        </Texto>
        <Cartao>
          <Campo
            rotulo="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="voce@exemplo.com"
          />
          <Campo
            rotulo="Senha"
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
            autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
            onSubmitEditing={enviar}
          />
          <Erro mensagem={erro} />
          {aviso && <Text style={{ color: cores.sucesso, fontSize: 15 }}>{aviso}</Text>}
          <Botao titulo={modo === 'entrar' ? 'Entrar' : 'Criar conta'} onPress={enviar} carregando={enviando} />
          <Botao
            variante="secundario"
            titulo={modo === 'entrar' ? 'Ainda não tenho conta' : 'Já tenho conta'}
            onPress={() => setModo(modo === 'entrar' ? 'criar' : 'entrar')}
          />
        </Cartao>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  conteudo: { padding: 20, gap: 16, maxWidth: 480, width: '100%', alignSelf: 'center', paddingTop: 64 },
  marca: { fontSize: 32, fontWeight: '800', color: cores.primaria },
});

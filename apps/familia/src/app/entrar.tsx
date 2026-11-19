import { VERSAO_TERMOS } from '@cuida/cliente';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { Opcao } from '@/components/opcao';
import { Botao, Campo, Cartao, cores, Erro, Texto } from '@/components/ui';
import { aceitarTermos } from '@/lib/termos';
import { supabase } from '@/lib/supabase';
import { fontes, paleta } from '@/lib/tema';

export default function Entrar() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [modo, setModo] = useState<'entrar' | 'criar'>('entrar');
  const [aceitouTermos, setAceitouTermos] = useState(false);
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
    if (modo === 'criar' && !aceitouTermos) {
      setErro('Para criar a conta, leia e aceite os termos de uso e privacidade.');
      return;
    }
    setEnviando(true);
    const { data, error } =
      modo === 'entrar'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
        : await supabase.auth.signUp({
            email: email.trim(),
            password: senha,
            // Se a conta precisar confirmar o e-mail, o aceite é gravado no primeiro login (lib/termos.ts).
            options: { data: { termos_versao: VERSAO_TERMOS } },
          });
    if (!error && modo === 'criar' && data.session) await aceitarTermos();
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
          {modo === 'criar' && (
            <>
              <Opcao marcada={aceitouTermos} onPress={() => setAceitouTermos(!aceitouTermos)}>
                Li e aceito os termos de uso e privacidade
              </Opcao>
              <Botao variante="texto" titulo="Ler os termos" onPress={() => router.push('/termos')} />
            </>
          )}
          <Erro mensagem={erro} />
          {aviso && <Text style={{ color: paleta.salvia.texto, fontSize: 15, fontFamily: fontes.texto }}>{aviso}</Text>}
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
  marca: { fontSize: 34, fontFamily: fontes.destaque, color: cores.texto, letterSpacing: -0.3 },
});

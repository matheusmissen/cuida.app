// Termos de uso e privacidade do familiar (Variação E). O texto vem de packages/cliente/src/termos.ts.
import { TERMOS_FAMILIA } from '@cuida/cliente';
import { BotaoPrincipal, BotaoSecundario, Cartao, cores, espacos, fontes, tamanhos } from '@cuida/visual';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';

const T = tamanhos.familia;

export function TextoTermos() {
  return (
    <View style={{ gap: 12 }}>
      {TERMOS_FAMILIA.map((s) => (
        <Cartao key={s.titulo} style={{ gap: 6 }}>
          <Text style={estilos.subtitulo}>{s.titulo}</Text>
          <Text style={estilos.texto}>{s.texto}</Text>
        </Cartao>
      ))}
    </View>
  );
}

/** Aparece uma vez para quem ainda não aceitou a versão atual (por exemplo, contas criadas antes). */
export function AceitarTermos({ aoAceitar }: { aoAceitar: () => Promise<boolean> }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}>
      <ScrollView contentContainerStyle={estilos.tela}>
        <Text style={estilos.titulo} accessibilityRole="header">
          Termos de uso e privacidade
        </Text>
        <Text style={estilos.texto}>Antes de continuar, leia com calma. É curto.</Text>
        <TextoTermos />
        {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
        <BotaoPrincipal
          tamanho="familia"
          rotulo={enviando ? 'Guardando…' : 'Li e aceito'}
          desabilitado={enviando}
          onPress={async () => {
            setErro(null);
            setEnviando(true);
            const ok = await aoAceitar();
            setEnviando(false);
            if (!ok) setErro('Não foi possível guardar agora. Verifique a internet e tente de novo.');
          }}
        />
        <BotaoSecundario tamanho="familia" rotulo="Sair da conta" onPress={() => supabase.auth.signOut()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { padding: espacos.lateral, paddingTop: 28, paddingBottom: 40, gap: espacos.bloco, maxWidth: 640, width: '100%', alignSelf: 'center' },
  titulo: { fontFamily: fontes.titulo, fontSize: T.titulo, lineHeight: T.titulo * 1.2, color: cores.texto },
  subtitulo: { fontFamily: fontes.titulo, fontSize: 18, color: cores.texto },
  texto: { fontFamily: fontes.texto, fontSize: T.texto, lineHeight: 23, color: cores.texto },
  erro: { fontFamily: fontes.textoNegrito, fontSize: T.texto, color: cores.alertaTexto },
});

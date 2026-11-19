// Apagar minha conta (LGPD; termos do familiar; visual da Variação E, docs/design.md).
// Mostra o que acontece em cada grupo (resumo_para_apagar_conta), pede a palavra APAGAR e chama a
// Edge Function apagar-conta. Depois sai da conta e volta para "Entrar" com o aviso.
import {
  apagaDadosDeAlguem,
  confirmacaoValida,
  ehContaDeDemonstracao,
  oQueAcontece,
  PALAVRA_APAGAR,
  type GrupoParaApagar,
} from '@cuida/cliente';
import { BotaoSecundario, Campo, Cartao, cores, espacos, fontes, IconeVoltar, tamanhos } from '@cuida/visual';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Botao } from '@/components/ui';
import { useSessao } from '@/lib/sessao';
import { supabase } from '@/lib/supabase';

export default function ApagarConta() {
  const { sessao } = useSessao();
  const [grupos, setGrupos] = useState<GrupoParaApagar[] | null>(null);
  const [palavra, setPalavra] = useState('');
  const [apagando, setApagando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    supabase.rpc('resumo_para_apagar_conta').then(({ data, error }) => {
      if (error) setErro('Não foi possível carregar os seus grupos. Verifique a internet.');
      setGrupos((data as GrupoParaApagar[] | null) ?? []);
    });
  }, []);

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/ajustes');
  }

  async function apagar() {
    setErro(null);
    if (!confirmacaoValida(palavra)) return setErro(`Para confirmar, escreva ${PALAVRA_APAGAR}.`);
    setApagando(true);
    const { error } = await supabase.functions.invoke('apagar-conta', { body: { confirmacao: PALAVRA_APAGAR } });
    if (error) {
      setApagando(false);
      return setErro('Não foi possível apagar a conta agora. Verifique a internet e tente de novo.');
    }
    await supabase.auth.signOut().catch(() => {});
    router.replace({ pathname: '/entrar', params: { conta: 'apagada' } });
  }

  const frases = oQueAcontece(grupos ?? []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}>
      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        <View style={estilos.topo}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar aos ajustes"
            onPress={voltar}
            style={({ pressed }) => [estilos.voltar, pressed && { opacity: 0.8 }]}
          >
            <IconeVoltar tamanho={22} />
          </Pressable>
          <Text style={estilos.titulo} accessibilityRole="header">
            Apagar minha conta
          </Text>
        </View>

        {ehContaDeDemonstracao(sessao?.user.email) ? (
          <>
            <Text style={estilos.texto}>Esta é a conta de demonstração: ela não pode ser apagada.</Text>
            <BotaoSecundario tamanho="familia" rotulo="Voltar aos ajustes" onPress={voltar} />
          </>
        ) : (
          <>
            <Text style={estilos.texto}>
              A conta {sessao?.user.email ? `${sessao.user.email} ` : ''}e os seus dados serão apagados. Não dá para
              desfazer.
            </Text>

            {grupos === null ? (
              <ActivityIndicator color={cores.primaria} style={{ marginTop: 16 }} />
            ) : (
              <Cartao style={[{ gap: 12 }, apagaDadosDeAlguem(grupos) && estilos.alerta]}>
                <Text style={estilos.subtitulo}>O que acontece</Text>
                {frases.length === 0 ? (
                  <Text style={estilos.texto}>Você não está em nenhum grupo de cuidado.</Text>
                ) : (
                  frases.map((f) => (
                    <Text key={f} style={estilos.texto}>
                      • {f}
                    </Text>
                  ))
                )}
              </Cartao>
            )}

            <Campo
              rotulo={`Para confirmar, escreva ${PALAVRA_APAGAR}`}
              value={palavra}
              onChangeText={setPalavra}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder={PALAVRA_APAGAR}
            />
            {erro && (
              <Text style={estilos.erro} accessibilityLiveRegion="polite">
                {erro}
              </Text>
            )}
            <Botao
              variante="perigo"
              titulo="Apagar minha conta"
              carregando={apagando}
              desativado={grupos === null || !confirmacaoValida(palavra)}
              onPress={apagar}
            />
            <BotaoSecundario tamanho="familia" rotulo="Cancelar" onPress={voltar} desabilitado={apagando} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const t = tamanhos.familia;
const estilos = StyleSheet.create({
  conteudo: {
    flexGrow: 1,
    padding: espacos.lateral,
    paddingTop: 24,
    gap: espacos.bloco,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  voltar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { flex: 1, fontFamily: fontes.titulo, fontSize: t.titulo, lineHeight: t.titulo + 4, color: cores.texto },
  subtitulo: { fontFamily: fontes.titulo, fontSize: 19, color: cores.texto },
  texto: { fontFamily: fontes.texto, fontSize: t.texto, lineHeight: 23, color: cores.texto },
  alerta: { backgroundColor: cores.alertaFundo, borderColor: cores.alertaBorda },
  erro: { fontFamily: fontes.textoNegrito, fontSize: 15, lineHeight: 21, color: cores.alertaTexto },
});

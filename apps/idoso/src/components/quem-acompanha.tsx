// "Minha privacidade" (docs/PRD.md, "Dados e LGPD", item 3): quem acompanha o idoso e tirar alguém do
// grupo. Pergunta antes de tirar; nunca deixa o grupo vazio (regra no banco e em confirmacaoTirarDoGrupo).
import { confirmacaoTirarDoGrupo, papelParaOIdoso, type MembroParaOIdoso } from '@cuida/cliente';
import { BotaoPrincipal, BotaoSecundario, Cartao, cores, fontes } from '@cuida/visual';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { falar } from '@/lib/voz';

export function QuemAcompanha() {
  const [grupo, setGrupo] = useState<MembroParaOIdoso[] | null>(null);
  const [perguntando, setPerguntando] = useState<string | null>(null);
  const [tirando, setTirando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc('grupo_do_idoso');
    if (error) return setAviso('Não consegui mostrar o grupo agora. Verifique a internet.');
    setGrupo((data as MembroParaOIdoso[]) ?? []);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function tirar(pessoa: MembroParaOIdoso) {
    setTirando(true);
    setAviso(null);
    const { error } = await supabase.rpc('idoso_tirar_do_grupo', { p_usuario: pessoa.usuario_id });
    setTirando(false);
    setPerguntando(null);
    if (error) {
      setAviso(/única pessoa/i.test(error.message) ? 'Alguém precisa cuidar dos seus remédios.' : 'Não consegui agora. Tente de novo.');
      return;
    }
    const frase = `Pronto. ${pessoa.nome} não está mais no grupo.`;
    setAviso(frase);
    falar(frase);
    carregar();
  }

  return (
    <View style={{ gap: 12 }}>
      <Text style={estilos.titulo} accessibilityRole="header">
        Quem acompanha você
      </Text>
      {grupo === null && !aviso ? <ActivityIndicator color={cores.primaria} /> : null}
      {grupo?.length === 0 ? <Text style={estilos.texto}>Ninguém da família está no grupo agora.</Text> : null}
      {grupo?.map((p) => {
        const confirmacao = confirmacaoTirarDoGrupo(p, grupo);
        const aberta = perguntando === p.usuario_id;
        return (
          <Cartao key={p.usuario_id} destaque={aberta} style={{ gap: 10 }}>
            <Text style={estilos.nome}>{p.nome}</Text>
            <Text style={estilos.papel}>{papelParaOIdoso(p.papel)}</Text>
            {aberta ? (
              <>
                <Text style={estilos.pergunta}>{confirmacao.pergunta}</Text>
                <Text style={estilos.texto}>{confirmacao.detalhe}</Text>
                {confirmacao.podeTirar ? (
                  <BotaoPrincipal rotulo={tirando ? 'Tirando…' : 'Sim, tirar'} onPress={() => tirar(p)} desabilitado={tirando} />
                ) : null}
                <BotaoSecundario rotulo={confirmacao.podeTirar ? 'Não' : 'Entendi'} onPress={() => setPerguntando(null)} />
              </>
            ) : (
              <BotaoSecundario rotulo="Tirar do grupo" onPress={() => setPerguntando(p.usuario_id)} />
            )}
          </Cartao>
        );
      })}
      {aviso ? (
        <Text style={estilos.aviso} accessibilityLiveRegion="polite">
          {aviso}
        </Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: fontes.titulo, fontSize: 26, lineHeight: 32, color: cores.texto, marginTop: 8 },
  nome: { fontFamily: fontes.titulo, fontSize: 24, lineHeight: 30, color: cores.texto },
  papel: { fontFamily: fontes.texto, fontSize: 20, lineHeight: 26, color: cores.textoSuave },
  pergunta: { fontFamily: fontes.textoNegrito, fontSize: 22, lineHeight: 28, color: cores.texto },
  texto: { fontFamily: fontes.texto, fontSize: 21, lineHeight: 29, color: cores.texto },
  aviso: { fontFamily: fontes.textoNegrito, fontSize: 21, lineHeight: 28, color: cores.primariaEscura },
});

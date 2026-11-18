// Conectar o celular do idoso (docs/PRD.md, seção 3; visual da Variação E).
// 1. A família manda o link de instalação por WhatsApp ou SMS.
// 2. No Cuida instalado, o idoso digita o código de 4 números que aparece aqui (passado por telefone).
// O código vale 30 minutos e só um fica ativo por vez; a tela percebe sozinha quando o celular conectou.
import { LINK_DO_APP_DO_IDOSO, linkDeLigacao, mensagemDeInstalacao } from '@cuida/cliente';
import {
  BotaoPrincipal,
  BotaoSecundario,
  Cartao,
  cores,
  espacos,
  fontes,
  IconeConfirmado,
  IconeTelefone,
  IconeVoltar,
  pasteis,
  Quadradinho,
  tamanhos,
} from '@cuida/visual';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePaciente } from '@/lib/paciente';
import { supabase } from '@/lib/supabase';

const T = tamanhos.familia;
const VALIDADE_MS = 30 * 60_000; // igual ao gerar_codigo_vinculo

export default function Conectar() {
  const { paciente, recarregar } = usePaciente();
  const [codigo, setCodigo] = useState<string | null>(null);
  const [expiraEm, setExpiraEm] = useState(0);
  const [agora, setAgora] = useState(Date.now());
  const [gerando, setGerando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const aparelhoAntes = useRef<string | null | undefined>(undefined);

  // Enquanto há código na tela, confere a cada 5 s se o celular conectou.
  useEffect(() => {
    if (!codigo) return;
    const timer = setInterval(() => {
      setAgora(Date.now());
      recarregar();
    }, 5_000);
    return () => clearInterval(timer);
  }, [codigo, recarregar]);

  if (!paciente) return null;
  const nome = paciente.apelido || paciente.nome;
  const conectouAgora = codigo !== null && paciente.usuario_id !== null && paciente.usuario_id !== aparelhoAntes.current;
  const expirado = codigo !== null && agora > expiraEm;
  const restante = Math.max(0, Math.ceil((expiraEm - agora) / 60_000));

  async function enviarLink() {
    const mensagem = mensagemDeInstalacao(nome);
    try {
      const nav = globalThis.navigator as Navigator | undefined;
      if (Platform.OS === 'web' && nav?.share) await nav.share({ text: mensagem });
      else if (Platform.OS === 'web' && nav?.clipboard) {
        await nav.clipboard.writeText(mensagem);
        setAviso('Mensagem copiada. Cole no WhatsApp ou no SMS.');
      } else await Share.share({ message: mensagem });
    } catch {
      // a pessoa fechou a janela de compartilhar
    }
  }

  async function gerar() {
    setAviso(null);
    setGerando(true);
    aparelhoAntes.current = paciente!.usuario_id;
    const { data, error } = await supabase.rpc('gerar_codigo_vinculo', { p_paciente: paciente!.id });
    setGerando(false);
    if (error) return setAviso('Não foi possível gerar o código agora. Tente de novo.');
    setCodigo(data as string);
    setAgora(Date.now());
    setExpiraEm(Date.now() + VALIDADE_MS);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}>
      <ScrollView contentContainerStyle={estilos.tela}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={({ pressed }) => [estilos.voltar, pressed && { opacity: 0.8 }]}
        >
          <IconeVoltar tamanho={20} cor={cores.texto} />
          <Text style={estilos.textoVoltar}>Voltar</Text>
        </Pressable>

        <Text style={estilos.titulo} accessibilityRole="header">
          Conectar o celular de {nome}
        </Text>

        {conectouAgora ? (
          <Cartao pastel="menta" style={estilos.linha}>
            <Quadradinho pastel="menta" tamanho={48}>
              <IconeConfirmado cor={pasteis.menta.icone} />
            </Quadradinho>
            <Text style={[estilos.texto, { flex: 1 }]}>
              <Text style={estilos.negrito}>Pronto! </Text>O celular de {nome} está conectado.
            </Text>
          </Cartao>
        ) : paciente.usuario_id ? (
          <Text style={estilos.rotulo}>Já existe um celular conectado. Um código novo troca para outro celular.</Text>
        ) : null}

        <Cartao style={{ gap: 12 }}>
          <Text style={estilos.subtitulo}>1. Mande o link de instalação</Text>
          <Text style={estilos.texto}>
            {nome} abre o link no celular e segue o passo a passo para colocar o Cuida na tela de início.
          </Text>
          <BotaoPrincipal tamanho="familia" rotulo="Enviar link por WhatsApp ou SMS" onPress={enviarLink} />
          <Text style={estilos.rotulo} selectable>
            {LINK_DO_APP_DO_IDOSO}
          </Text>
        </Cartao>

        <Cartao style={{ gap: 12 }}>
          <Text style={estilos.subtitulo}>2. Passe o código por telefone</Text>
          <Text style={estilos.texto}>
            Quando {nome} abrir o Cuida pelo ícone, ele vai pedir um código de 4 números. Ligue e passe o código:
          </Text>
          {codigo && !expirado && !conectouAgora ? (
            <View style={estilos.codigoCaixa}>
              <Text style={estilos.codigo} accessibilityLabel={`Código ${codigo.split('').join(' ')}`} selectable>
                {codigo.split('').join(' ')}
              </Text>
              <Text style={estilos.rotulo}>Vale por mais {restante} min. Só pode ser usado uma vez.</Text>
            </View>
          ) : null}
          {expirado && !conectouAgora ? <Text style={estilos.rotulo}>O código venceu. Gere outro.</Text> : null}
          <BotaoSecundario
            tamanho="familia"
            rotulo={gerando ? 'Gerando…' : codigo ? 'Gerar outro código' : 'Mostrar o código'}
            onPress={gerar}
            desabilitado={gerando}
          />
          {paciente.telefone ? (
            <BotaoSecundario
              tamanho="familia"
              rotulo={`Ligar para ${nome}`}
              icone={<IconeTelefone cor={cores.primaria} />}
              onPress={() => paciente.telefone && Linking.openURL(linkDeLigacao(paciente.telefone))}
            />
          ) : null}
        </Cartao>

        {aviso ? <Text style={estilos.aviso}>{aviso}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: {
    flexGrow: 1,
    padding: espacos.lateral,
    paddingTop: 24,
    paddingBottom: 40,
    gap: espacos.bloco,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  voltar: {
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingLeft: 12,
    paddingRight: 18,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  textoVoltar: { fontFamily: fontes.textoNegrito, fontSize: T.texto, color: cores.texto },
  titulo: { fontFamily: fontes.titulo, fontSize: T.titulo, lineHeight: T.titulo * 1.2, color: cores.texto },
  subtitulo: { fontFamily: fontes.titulo, fontSize: 20, color: cores.texto },
  texto: { fontFamily: fontes.texto, fontSize: T.texto, lineHeight: 23, color: cores.texto },
  negrito: { fontFamily: fontes.textoNegrito, fontSize: T.texto, color: cores.texto },
  rotulo: { fontFamily: fontes.texto, fontSize: T.minimo + 1, color: cores.textoSuave },
  aviso: { fontFamily: fontes.textoNegrito, fontSize: T.texto, color: cores.primariaEscura },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  codigoCaixa: {
    gap: 4,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: pasteis.menta.borda,
    backgroundColor: pasteis.menta.fundo,
    alignItems: 'center',
  },
  codigo: { fontFamily: fontes.titulo, fontSize: 52, letterSpacing: 6, color: cores.primariaEscura },
});

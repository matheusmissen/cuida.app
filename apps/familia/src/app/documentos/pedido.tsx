// Confira o pedido (docs/PRD.md, seção 7; visual da Variação E, docs/design.md).
// A Lia (Edge Function ler-receita) lê o pedido médico, a guia ou o cartão de retorno e só SUGERE
// data, médico, especialidade, local e preparo. A consulta só nasce em conferir_pedido, com os dados
// que a família conferiu. Onde a Lia não leu, o campo fica vazio e o motivo aparece em "Precisa de você".
import {
  consultaDoFormulario,
  formularioDoPedido,
  quandoPorExtenso,
  SELECT_DOCUMENTO,
  type DocumentoLinha,
  type FormularioPedido,
} from '@cuida/cliente';
import {
  BotaoPrincipal,
  BotaoSecundario,
  Campo,
  Cartao,
  cores,
  espacos,
  fontes,
  IconeCalendario,
  IconeConfirmado,
  IconeVoltar,
  pasteis,
  Quadradinho,
  tamanhos,
} from '@cuida/visual';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { abrirArquivo, lerReceita, linkDoArquivo } from '@/lib/documentos';
import { supabase } from '@/lib/supabase';

export default function ConfiraOPedido() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [doc, setDoc] = useState<DocumentoLinha | null>(null);
  const [form, setForm] = useState<FormularioPedido>(formularioDoPedido(null));
  const [miniatura, setMiniatura] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [erroLeitura, setErroLeitura] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [marcadaEm, setMarcadaEm] = useState<string | null>(null);
  const pediu = useRef(false);
  const statusAnterior = useRef<string | null>(null);

  const carregar = useCallback(async () => {
    if (!id) return null;
    const { data, error } = await supabase.from('documentos').select(SELECT_DOCUMENTO).eq('id', id).maybeSingle();
    if (error || !data) {
      setErro('Pedido não encontrado.');
      return null;
    }
    const d = data as DocumentoLinha;
    // O formulário começa da leitura uma vez; recargas não apagam o que a família escreveu.
    if (d.status === 'aguardando_conferencia' && statusAnterior.current !== 'aguardando_conferencia') {
      setForm(formularioDoPedido(d.leitura?.pedido));
    }
    statusAnterior.current = d.status;
    setDoc(d);
    return d;
  }, [id]);

  const pedirLeitura = useCallback(async () => {
    if (!id) return;
    setErroLeitura(null);
    setDoc((d) => (d ? { ...d, status: 'lendo' } : d));
    const { erro: problema } = await lerReceita(id, 'pedido');
    if (problema) setErroLeitura(problema);
    await carregar();
  }, [id, carregar]);

  // Abre o pedido; se ainda não foi lido, pede a leitura à Lia (uma vez).
  useEffect(() => {
    carregar().then((d) => {
      if (d?.status === 'enviado' && !pediu.current) {
        pediu.current = true;
        pedirLeitura();
      }
    });
  }, [carregar, pedirLeitura]);

  // Leitura em andamento (por outra tela ou outro familiar): acompanha.
  useEffect(() => {
    if (doc?.status !== 'lendo') return;
    const t = setInterval(carregar, 3000);
    return () => clearInterval(t);
  }, [doc?.status, carregar]);

  useEffect(() => {
    if (doc && doc.mime?.startsWith('image/')) linkDoArquivo(doc.arquivo_path).then(setMiniatura);
  }, [doc?.arquivo_path, doc?.mime]); // eslint-disable-line react-hooks/exhaustive-deps

  async function conferir(criar: boolean) {
    if (!doc) return;
    setErro(null);
    let consulta = null;
    if (criar) {
      const r = consultaDoFormulario(form, new Date());
      if ('erro' in r) return setErro(r.erro);
      consulta = r.consulta;
    }
    setSalvando(true);
    const { error } = await supabase.rpc('conferir_pedido', { p_documento: doc.id, p_consulta: consulta });
    setSalvando(false);
    if (error) return setErro(error.message);
    if (consulta) setMarcadaEm(consulta.quando);
    await carregar();
  }

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/documentos', params: { aba: 'pedidos' } });
  }

  const pedido = doc?.leitura?.pedido;
  const mudar = (campo: keyof FormularioPedido) => (valor: string) => setForm((f) => ({ ...f, [campo]: valor }));
  const lendo = doc?.status === 'lendo' || doc?.status === 'enviado';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}>
      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        <View style={estilos.topo}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar aos documentos"
            onPress={voltar}
            style={({ pressed }) => [estilos.voltar, pressed && { opacity: 0.8 }]}
          >
            <IconeVoltar tamanho={22} />
          </Pressable>
          <Text style={estilos.titulo} accessibilityRole="header">
            {doc?.status === 'conferida' ? 'Pedido conferido' : 'Confira o pedido'}
          </Text>
        </View>

        {doc && (
          <Cartao pastel="amarelo" style={estilos.resumo}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ver o pedido"
              onPress={() => abrirArquivo(doc.arquivo_path)}
              style={estilos.miniatura}
            >
              {miniatura ? (
                <Image source={{ uri: miniatura }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <IconeCalendario tamanho={26} cor={pasteis.amarelo.icone} />
              )}
            </Pressable>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={estilos.resumoTitulo}>
                {lendo
                  ? 'A Lia está lendo o pedido…'
                  : doc.status === 'erro'
                    ? 'A Lia não conseguiu ler'
                    : doc.status === 'conferida'
                      ? doc.consulta_id
                        ? 'Consulta marcada'
                        : 'Guardado sem consulta'
                      : 'A Lia sugeriu a consulta'}
              </Text>
              <Text style={estilos.resumoTexto}>
                {doc.status === 'aguardando_conferencia'
                  ? 'Confira cada campo com o papel. Nada é salvo sem você.'
                  : pedido?.descricao || doc.titulo}
              </Text>
            </View>
          </Cartao>
        )}

        {!doc && !erro && <ActivityIndicator color={cores.primaria} style={{ marginTop: 32 }} />}

        {lendo && (
          <View style={estilos.linha} accessibilityLiveRegion="polite">
            <ActivityIndicator color={cores.primaria} />
            <Text style={estilos.texto}>Isso leva alguns segundos. Nenhuma consulta é criada sem você conferir.</Text>
          </View>
        )}

        {doc?.status === 'erro' && (
          <View style={{ gap: 10 }}>
            <Text style={estilos.erro}>{erroLeitura ?? 'Não foi possível ler o pedido agora.'}</Text>
            <BotaoPrincipal tamanho="familia" rotulo="Tentar ler de novo" onPress={pedirLeitura} />
            <BotaoSecundario tamanho="familia" rotulo="Marcar a consulta à mão" onPress={() => router.push('/consultas')} />
          </View>
        )}

        {doc?.status === 'aguardando_conferencia' && (
          <>
            {pedido && pedido.motivos.length > 0 && (
              <View style={estilos.precisa} accessibilityRole="summary">
                <Text style={estilos.precisaTitulo}>Precisa de você</Text>
                {pedido.motivos.map((m) => (
                  <Text key={m} style={estilos.precisaTexto}>
                    • {m}
                  </Text>
                ))}
              </View>
            )}
            <Cartao style={{ gap: 14 }}>
              <View style={estilos.duas}>
                <View style={{ flex: 1 }}>
                  <Campo rotulo="Data" value={form.data} onChangeText={mudar('data')} placeholder="dd/mm/aaaa" inputMode="numeric" maxLength={10} />
                </View>
                <View style={{ flex: 1 }}>
                  <Campo rotulo="Horário" value={form.hora} onChangeText={mudar('hora')} placeholder="hh:mm" inputMode="numeric" maxLength={5} />
                </View>
              </View>
              <Campo rotulo="Médico" value={form.medico} onChangeText={mudar('medico')} placeholder="Ex.: Dra. Ana" maxLength={80} />
              <Campo rotulo="Especialidade ou exame" value={form.especialidade} onChangeText={mudar('especialidade')} placeholder="Ex.: Hematologia" maxLength={60} />
              <Campo rotulo="Local (opcional)" value={form.local} onChangeText={mudar('local')} placeholder="Ex.: Clínica, sala 3" maxLength={120} />
              <Campo rotulo="Observação (opcional)" value={form.observacao} onChangeText={mudar('observacao')} placeholder="Ex.: jejum de 8 horas" maxLength={300} />
              <Text style={estilos.suave}>
                O celular de quem você cuida avisa no dia anterior e 3 horas antes.
              </Text>
            </Cartao>
            {erro && <Text style={estilos.erro} accessibilityLiveRegion="polite">{erro}</Text>}
            <BotaoPrincipal
              tamanho="familia"
              rotulo={salvando ? 'Salvando…' : 'Criar consulta'}
              icone={<IconeCalendario tamanho={22} cor={cores.sobrePrimaria} />}
              desabilitado={salvando}
              onPress={() => conferir(true)}
            />
            <BotaoSecundario tamanho="familia" rotulo="Guardar sem consulta" desabilitado={salvando} onPress={() => conferir(false)} />
          </>
        )}

        {doc?.status === 'conferida' && (
          <View style={{ gap: 10 }}>
            {(marcadaEm || doc.consulta_id) && (
              <Cartao pastel="menta" style={estilos.linha}>
                <Quadradinho pastel="menta" tamanho={44}>
                  <IconeConfirmado tamanho={24} cor={pasteis.menta.icone} />
                </Quadradinho>
                <Text style={[estilos.texto, { flex: 1, fontFamily: fontes.textoNegrito, color: pasteis.menta.icone }]}>
                  {marcadaEm ? `Consulta marcada: ${quandoPorExtenso(marcadaEm, new Date())}.` : 'A consulta está em Consultas.'}
                </Text>
              </Cartao>
            )}
            <BotaoPrincipal tamanho="familia" rotulo="Ver consultas" onPress={() => router.navigate('/consultas')} />
            <BotaoSecundario
              tamanho="familia"
              rotulo="Voltar aos documentos"
              onPress={() => router.navigate({ pathname: '/documentos', params: { aba: 'pedidos' } })}
            />
          </View>
        )}
        {erro && doc?.status !== 'aguardando_conferencia' && <Text style={estilos.erro}>{erro}</Text>}
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
  resumo: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12 },
  miniatura: {
    width: 60,
    height: 76,
    borderRadius: 12,
    backgroundColor: cores.superficie,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumoTitulo: { fontFamily: fontes.textoNegrito, fontSize: 16, color: pasteis.amarelo.icone },
  resumoTexto: { fontFamily: fontes.texto, fontSize: 15, lineHeight: 20, color: cores.texto },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  texto: { flex: 1, fontFamily: fontes.texto, fontSize: t.texto, lineHeight: 22, color: cores.texto },
  suave: { fontFamily: fontes.texto, fontSize: 15, lineHeight: 20, color: cores.textoSuave },
  duas: { flexDirection: 'row', gap: 12 },
  precisa: {
    backgroundColor: cores.alertaFundo,
    borderColor: cores.alertaBorda,
    borderWidth: 1.5,
    borderRadius: 24,
    padding: 16,
    gap: 6,
  },
  precisaTitulo: { fontFamily: fontes.titulo, fontSize: 18, color: cores.alertaTexto },
  precisaTexto: { fontFamily: fontes.texto, fontSize: 15, lineHeight: 21, color: cores.alertaTexto },
  erro: { fontFamily: fontes.textoNegrito, fontSize: 15, lineHeight: 21, color: cores.alertaTexto },
});

// Confira a receita (visual da Variação E, docs/design.md).
// A Lia (Edge Function ler-receita) só SUGERE. Itens "Precisa de você" ficam de fora até a família
// definir os horários. Os alarmes só nascem em criar_alarmes_da_receita, com os itens conferidos.
import {
  aplicarEdicao,
  contarAlarmesConferidos,
  descricaoDoItem,
  horaCurta,
  itensParaConferencia,
  itensParaCriar,
  oQueFalta,
  rodapeDeFora,
  SELECT_DOCUMENTO,
  type DocumentoLinha,
  type ItemConferencia,
} from '@cuida/cliente';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Opcao } from '@/components/cadastro-paciente';
import { IconeCheck, IconeDocumento, IconeLapis, IconeRelogio, IconeSetaEsquerda, IconeSino } from '@/components/icones';
import { Botao, Campo, Erro, Selo } from '@/components/ui';
import { abrirArquivo, lerReceita, linkDoArquivo } from '@/lib/documentos';
import { supabase } from '@/lib/supabase';
import { espacos, fontes, paleta, sombras } from '@/lib/tema';

export default function ConfiraAReceita() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [doc, setDoc] = useState<DocumentoLinha | null>(null);
  const [itens, setItens] = useState<ItemConferencia[]>([]);
  const [miniatura, setMiniatura] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [erroLeitura, setErroLeitura] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [criados, setCriados] = useState<number | null>(null);
  const pedido = useRef(false);
  const statusAnterior = useRef<string | null>(null);

  const carregar = useCallback(async () => {
    if (!id) return null;
    const { data, error } = await supabase.from('documentos').select(SELECT_DOCUMENTO).eq('id', id).maybeSingle();
    if (error || !data) {
      setErro('Receita não encontrada.');
      return null;
    }
    const d = data as DocumentoLinha;
    // A conferência começa da leitura uma vez; recargas não apagam o que a família editou.
    if (d.status === 'aguardando_conferencia' && statusAnterior.current !== 'aguardando_conferencia') {
      setItens(itensParaConferencia(d.leitura?.itens));
    }
    statusAnterior.current = d.status;
    setDoc(d);
    return d;
  }, [id]);

  const pedirLeitura = useCallback(async () => {
    if (!id) return;
    setErroLeitura(null);
    setDoc((d) => (d ? { ...d, status: 'lendo' } : d));
    const { erro: problema } = await lerReceita(id);
    if (problema) setErroLeitura(problema);
    await carregar();
  }, [id, carregar]);

  // Abre a receita; se ainda não foi lida, pede a leitura à Lia (uma vez).
  useEffect(() => {
    carregar().then((d) => {
      if (d?.status === 'enviado' && !pedido.current) {
        pedido.current = true;
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

  async function criarAlarmes() {
    if (!doc) return;
    setErro(null);
    setCriando(true);
    const { data, error } = await supabase.rpc('criar_alarmes_da_receita', {
      p_documento: doc.id,
      p_itens: itensParaCriar(itens),
    });
    setCriando(false);
    if (error) return setErro(error.message);
    setCriados(Number(data ?? 0));
    await carregar();
  }

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/documentos');
  }

  const total = doc?.leitura?.itens?.length ?? 0;
  const alarmes = contarAlarmesConferidos(itens);
  const rodape = rodapeDeFora(itens);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: paleta.fundo }}>
      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        <View style={estilos.topo}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar aos documentos"
            onPress={voltar}
            style={({ pressed }) => [estilos.voltar, pressed && { opacity: 0.8 }]}
          >
            <IconeSetaEsquerda tamanho={20} traco={2.2} cor={paleta.tinta} />
          </Pressable>
          <Text style={estilos.titulo} accessibilityRole="header">
            {doc?.status === 'conferida' ? 'Receita conferida' : 'Confira a receita'}
          </Text>
        </View>

        {doc && (
          <View style={estilos.resumo}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ver a receita"
              onPress={() => abrirArquivo(doc.arquivo_path)}
              style={estilos.miniatura}
            >
              {miniatura ? (
                <Image source={{ uri: miniatura }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <IconeDocumento tamanho={26} cor={paleta.lilas.forte} />
              )}
            </Pressable>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={estilos.resumoTitulo}>
                {doc.status === 'lendo' || doc.status === 'enviado'
                  ? 'A Lia está lendo a receita…'
                  : doc.status === 'erro'
                    ? 'A Lia não conseguiu ler'
                    : total === 0
                      ? 'A Lia não encontrou remédios'
                      : `A Lia leu ${total} ${total === 1 ? 'remédio' : 'remédios'}`}
              </Text>
              <Text style={estilos.resumoTexto}>
                {doc.status === 'conferida'
                  ? `Alarmes criados${doc.conferido_em ? ` às ${horaCurta(doc.conferido_em)}` : ''}. Você pode ver e ajustar em Remédios.`
                  : doc.status === 'aguardando_conferencia' && total > 0
                    ? 'Confira cada item com a receita em papel antes de ativar.'
                    : doc.titulo}
              </Text>
            </View>
          </View>
        )}

        <Erro mensagem={erro} />

        {!doc && !erro && <ActivityIndicator color={paleta.tinta} style={{ marginTop: 32 }} />}

        {(doc?.status === 'lendo' || doc?.status === 'enviado') && (
          <View style={estilos.lendo} accessibilityLiveRegion="polite">
            <ActivityIndicator color={paleta.lilas.forte} />
            <Text style={estilos.resumoTexto}>Isso leva alguns segundos. Nenhum alarme é criado sem você conferir.</Text>
          </View>
        )}

        {doc?.status === 'erro' && (
          <View style={{ gap: 10 }}>
            <Erro mensagem={erroLeitura ?? 'Não foi possível ler a receita agora.'} />
            <Botao titulo="Tentar ler de novo" onPress={pedirLeitura} />
            <Botao variante="secundario" titulo="Cadastrar os remédios à mão" onPress={() => router.push('/remedios')} />
          </View>
        )}

        {doc?.status === 'aguardando_conferencia' && total === 0 && (
          <View style={{ gap: 10 }}>
            <Text style={estilos.resumoTexto}>A foto pode estar escura ou cortada. Tente outra foto ou cadastre à mão.</Text>
            <Botao titulo="Tirar outra foto" onPress={() => router.replace({ pathname: '/documentos/adicionar', params: { tipo: 'receita' } })} />
            <Botao variante="secundario" titulo="Cadastrar os remédios à mão" onPress={() => router.push('/remedios')} />
          </View>
        )}

        {doc?.status === 'aguardando_conferencia' &&
          itens.map((item, i) => (
            <CartaoItem
              key={i}
              item={item}
              aoMudar={(novo) => setItens((atual) => atual.map((x, j) => (j === i ? novo : x)))}
            />
          ))}

        {doc?.status === 'conferida' && (
          <View style={{ gap: 10 }}>
            {criados !== null && (
              <View style={estilos.sucesso} accessibilityLiveRegion="polite">
                <IconeCheck tamanho={22} cor={paleta.salvia.forte} traco={2.6} />
                <Text style={estilos.textoSucesso}>
                  {criados === 1 ? '1 alarme criado' : `${criados} alarmes criados`}. O celular já vai tocar nos horários.
                </Text>
              </View>
            )}
            <Botao titulo="Ver remédios" onPress={() => router.navigate('/remedios')} />
            <Botao variante="secundario" titulo="Voltar aos documentos" onPress={() => router.navigate('/documentos')} />
          </View>
        )}

        {doc?.status === 'aguardando_conferencia' && total > 0 && (
          <>
            <View style={{ flexGrow: 1, minHeight: 8 }} />
            <Botao
              titulo={
                alarmes === 0
                  ? 'Defina os horários para criar alarmes'
                  : alarmes === 1
                    ? 'Criar 1 alarme'
                    : `Criar ${alarmes} alarmes`
              }
              icone={<IconeSino tamanho={22} cor={paleta.sobreTinta} traco={2.2} />}
              desativado={alarmes === 0}
              carregando={criando}
              onPress={criarAlarmes}
            />
            {rodape && <Text style={estilos.rodape}>{rodape}</Text>}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CartaoItem({ item, aoMudar }: { item: ItemConferencia; aoMudar: (i: ItemConferencia) => void }) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(item.nome);
  const [dose, setDose] = useState(item.dose);
  const [horarios, setHorarios] = useState(item.horarios.join(', '));
  const [critico, setCritico] = useState(item.critico);
  const [erro, setErro] = useState<string | null>(null);
  const pendente = !item.conferido && !item.deFora;

  function abrirEditor() {
    setNome(item.nome === 'Remédio sem nome' ? '' : item.nome);
    setDose(item.dose);
    setHorarios(item.horarios.join(', '));
    setCritico(item.critico);
    setErro(null);
    setEditando(true);
  }

  function salvar() {
    const r = aplicarEdicao(item, { nome, dose, horarios, critico });
    if ('erro' in r) return setErro(r.erro);
    aoMudar(r.item);
    setEditando(false);
  }

  return (
    <View style={[estilos.item, pendente && estilos.itemPendente, item.deFora && { opacity: 0.75 }]}>
      <View style={estilos.linhaItem}>
        <Text style={estilos.nomeItem}>{item.nome}</Text>
        {pendente ? (
          <Selo texto="Precisa de você" cor={paleta.sobreTinta} fundo={paleta.primaria} />
        ) : item.deFora ? (
          <Selo texto="Sem alarme" cor={paleta.textoSuave} fundo={paleta.superficieNeutra} />
        ) : (
          <Selo texto="Conferido" cor={paleta.salvia.texto} fundo={paleta.salvia.fundo} />
        )}
        {!pendente && !editando && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Editar ${item.nome}`}
            onPress={abrirEditor}
            style={estilos.editar}
          >
            <IconeLapis tamanho={18} cor={paleta.tinta} />
          </Pressable>
        )}
      </View>

      {pendente ? (
        <Text style={estilos.descricao}>
          {item.dose ? `${item.dose} · ` : ''}
          <Text style={{ fontFamily: fontes.textoNegrito, color: paleta.tinta }}>{oQueFalta(item)}</Text>
        </Text>
      ) : (
        <Text style={estilos.descricao}>{descricaoDoItem(item)}</Text>
      )}
      {item.critico && !item.deFora && <Text style={estilos.descricao}>Remédio crítico: dose perdida avisa todo o círculo.</Text>}
      {item.observacao ? <Text style={estilos.descricao}>{item.observacao}</Text> : null}

      {item.horarios.length > 0 && !editando && (
        <View style={estilos.horas}>
          {item.horarios.map((h) => (
            <View key={h} style={estilos.hora}>
              <Text style={estilos.textoHora}>{h}</Text>
            </View>
          ))}
        </View>
      )}

      {pendente && !editando && (
        <Pressable accessibilityRole="button" onPress={abrirEditor} style={({ pressed }) => [estilos.definir, pressed && { opacity: 0.8 }]}>
          <IconeRelogio tamanho={18} cor={paleta.tinta} />
          <Text style={estilos.textoDefinir}>Definir horários</Text>
        </Pressable>
      )}

      {editando && (
        <View style={{ gap: 10, marginTop: 4 }}>
          <Campo rotulo="Remédio" value={nome} onChangeText={setNome} placeholder="Nome como está na receita" />
          <Campo rotulo="Dose" value={dose} onChangeText={setDose} placeholder="Ex.: 1 comprimido" />
          <Campo
            rotulo="Horários"
            value={horarios}
            onChangeText={setHorarios}
            placeholder="08:00, 20:00"
            autoCapitalize="none"
            autoFocus={item.horarios.length === 0}
          />
          <Opcao marcada={critico} onPress={() => setCritico(!critico)}>
            Remédio crítico (dose perdida avisa todo o círculo na hora)
          </Opcao>
          <Erro mensagem={erro} />
          <Botao titulo="Salvar" onPress={salvar} />
          {!item.deFora && (
            <Botao
              variante="secundario"
              titulo="Não criar alarme para este"
              onPress={() => {
                aoMudar({ ...item, deFora: true });
                setEditando(false);
              }}
            />
          )}
          <Botao variante="texto" titulo="Cancelar" onPress={() => setEditando(false)} />
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  conteudo: {
    flexGrow: 1,
    padding: espacos.margemTelaFamilia,
    paddingTop: 24,
    paddingBottom: 22,
    gap: 12,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  voltar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: paleta.cartao,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: sombras.cartao,
  },
  titulo: { fontFamily: fontes.destaque, fontSize: 26, lineHeight: 29, color: paleta.tinta, flex: 1 },
  resumo: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: paleta.lilas.fundo, borderRadius: 24, padding: 12 },
  miniatura: {
    width: 60,
    height: 76,
    borderRadius: 12,
    backgroundColor: paleta.cartao,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumoTitulo: { fontFamily: fontes.textoNegrito, fontSize: 15, color: paleta.lilas.texto },
  resumoTexto: { fontFamily: fontes.texto, fontSize: 14, lineHeight: 19, color: paleta.lilas.texto },
  lendo: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8 },
  item: { backgroundColor: paleta.cartao, borderRadius: 24, paddingVertical: 14, paddingHorizontal: 16, gap: 8, boxShadow: sombras.cartao },
  itemPendente: { borderWidth: 2, borderStyle: 'dashed', borderColor: paleta.primaria, boxShadow: undefined },
  linhaItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nomeItem: { flex: 1, fontFamily: fontes.textoNegrito, fontSize: 17, color: paleta.tinta },
  editar: { width: 40, height: 40, borderRadius: 20, backgroundColor: paleta.superficieNeutra, alignItems: 'center', justifyContent: 'center' },
  descricao: { fontFamily: fontes.texto, fontSize: 15, lineHeight: 21, color: paleta.textoSecundario },
  horas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  hora: { backgroundColor: paleta.superficieNeutra, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
  textoHora: { fontFamily: fontes.textoNegrito, fontSize: 14, color: paleta.tinta },
  definir: {
    alignSelf: 'flex-start',
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: paleta.superficieNeutra,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textoDefinir: { fontFamily: fontes.textoNegrito, fontSize: 15, color: paleta.tinta },
  sucesso: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: paleta.salvia.fundo, borderRadius: 24, padding: 16 },
  textoSucesso: { flex: 1, fontFamily: fontes.textoNegrito, fontSize: 15, lineHeight: 21, color: paleta.salvia.texto },
  rodape: { fontFamily: fontes.texto, fontSize: 13, lineHeight: 18, color: paleta.textoSuave, textAlign: 'center' },
});

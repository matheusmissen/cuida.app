// Documentos da família (visual da Variação E, docs/design.md).
// Receitas (lidas pela Lia e conferidas pela família), exames e relatórios (só guardados).
import {
  SELECT_DOCUMENTO,
  situacaoDoDocumento,
  type DocumentoLinha,
  type SituacaoDocumento,
  type TipoDocumento,
} from '@cuida/cliente';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconeCamera, IconeDocumento, IconeLeitura, IconeMais } from '@/components/icones';
import { BarraNavegacao, ESPACO_BARRA } from '@/components/navegacao';
import { Cartao, Divisor, Erro, Selo, Texto, TituloPagina } from '@/components/ui';
import { abrirArquivo } from '@/lib/documentos';
import { usePaciente } from '@/lib/paciente';
import { supabase } from '@/lib/supabase';
import { espacos, fontes, paleta, sombras } from '@/lib/tema';

type AbaDoc = 'receitas' | 'exames' | 'relatorios';
const TIPO_DA_ABA: Record<AbaDoc, TipoDocumento> = { receitas: 'receita', exames: 'exame', relatorios: 'relatorio' };
const NOME_ABA: Record<AbaDoc, string> = { receitas: 'Receitas', exames: 'Exames', relatorios: 'Relatórios' };
const VAZIO: Record<AbaDoc, string> = {
  receitas: 'Nenhuma receita ainda.',
  exames: 'Nenhum exame guardado. Toque em + para adicionar.',
  relatorios: 'Nenhum relatório guardado. Toque em + para adicionar.',
};
const SELO: Record<SituacaoDocumento, { texto: string; cor: string; fundo: string }> = {
  conferir: { texto: 'Conferir', cor: paleta.sobreTinta, fundo: paleta.primaria },
  ativa: { texto: 'Alarmes ativos', cor: paleta.salvia.texto, fundo: paleta.salvia.fundo },
  lendo: { texto: 'Lendo…', cor: paleta.lilas.texto, fundo: paleta.lilas.fundo },
  erro: { texto: 'Não lida', cor: paleta.alerta.texto, fundo: paleta.alerta.fundo },
  guardado: { texto: 'Guardado', cor: paleta.textoSuave, fundo: paleta.superficieNeutra },
};

function dataCurtaDoc(d: DocumentoLinha): string {
  const iso = d.data_documento ? `${d.data_documento}T12:00:00-03:00` : d.criado_em;
  const fmt = (x: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(x);
  if (fmt(new Date(iso)) === fmt(new Date())) return 'Hoje';
  return new Date(iso)
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' })
    .replace('.', '');
}

function detalhe(d: DocumentoLinha): string {
  const partes = [dataCurtaDoc(d)];
  const n = d.leitura?.itens?.length;
  if (d.tipo === 'receita' && typeof n === 'number') partes.push(n === 1 ? '1 remédio' : `${n} remédios`);
  if (d.tipo !== 'receita') partes.push(d.mime === 'application/pdf' ? 'PDF' : 'Foto');
  return partes.join(' · ');
}

export default function Documentos() {
  const { paciente } = usePaciente();
  const { aba: abaParam } = useLocalSearchParams<{ aba?: string }>();
  const [aba, setAba] = useState<AbaDoc>(abaParam === 'exames' || abaParam === 'relatorios' ? abaParam : 'receitas');
  const [documentos, setDocumentos] = useState<DocumentoLinha[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (abaParam === 'exames' || abaParam === 'relatorios' || abaParam === 'receitas') setAba(abaParam);
  }, [abaParam]);

  const carregar = useCallback(async () => {
    if (!paciente) return;
    const { data, error } = await supabase
      .from('documentos')
      .select(SELECT_DOCUMENTO)
      .eq('paciente_id', paciente.id)
      .order('criado_em', { ascending: false });
    setErro(error ? 'Não foi possível carregar os documentos.' : null);
    if (!error) setDocumentos((data as DocumentoLinha[]) ?? []);
  }, [paciente]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  // Enquanto alguma receita está sendo lida, atualiza a cada 4 s.
  const lendo = (documentos ?? []).some((d) => situacaoDoDocumento(d) === 'lendo');
  useEffect(() => {
    if (!lendo) return;
    const t = setInterval(carregar, 4000);
    return () => clearInterval(t);
  }, [lendo, carregar]);

  if (!paciente) return null;
  const nome = paciente.apelido || paciente.nome;
  const contagem = (a: AbaDoc) => (documentos ?? []).filter((d) => d.tipo === TIPO_DA_ABA[a]).length;
  const lista = (documentos ?? []).filter((d) => d.tipo === TIPO_DA_ABA[aba]);

  async function abrir(d: DocumentoLinha) {
    if (d.tipo === 'receita') {
      router.push({ pathname: '/documentos/receita', params: { id: d.id } });
      return;
    }
    if (!(await abrirArquivo(d.arquivo_path))) setErro('Não foi possível abrir o arquivo agora.');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: paleta.fundo }}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={estilos.cabecalho}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={estilos.sub}>{nome}</Text>
            <TituloPagina>Documentos</TituloPagina>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Adicionar documento"
            onPress={() => router.push({ pathname: '/documentos/adicionar', params: { tipo: TIPO_DA_ABA[aba] } })}
            style={({ pressed }) => [estilos.mais, pressed && { opacity: 0.85 }]}
          >
            <IconeMais tamanho={24} cor={paleta.sobreTinta} traco={2.4} />
          </Pressable>
        </View>

        <View style={estilos.abas} accessibilityRole="tablist" aria-label="Tipo de documento">
          {(Object.keys(NOME_ABA) as AbaDoc[]).map((a) => {
            const ativa = a === aba;
            const n = contagem(a);
            return (
              <Pressable
                key={a}
                accessibilityRole="tab"
                accessibilityState={{ selected: ativa }}
                accessibilityLabel={n ? `${NOME_ABA[a]}, ${n}` : NOME_ABA[a]}
                onPress={() => setAba(a)}
                style={[estilos.aba, ativa && { backgroundColor: paleta.primaria }]}
              >
                <Text style={[estilos.textoAba, ativa && { color: paleta.sobreTinta }]} numberOfLines={1}>
                  {NOME_ABA[a]}
                  {n && a !== 'receitas' ? ` · ${n}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {aba === 'receitas' && (
          <View style={estilos.nova}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={estilos.iconeNova}>
                <IconeLeitura tamanho={22} cor={paleta.sobreTinta} />
              </View>
              <Text style={estilos.tituloNova}>Nova receita?</Text>
            </View>
            <Text style={estilos.textoNova}>
              Tire uma foto. A Lia lê os remédios e sugere os alarmes, e você confere antes de ativar.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/documentos/adicionar', params: { tipo: 'receita' } })}
              style={({ pressed }) => [estilos.lerReceita, pressed && { opacity: 0.85 }]}
            >
              <IconeCamera tamanho={18} cor={paleta.sobreTinta} traco={2.2} />
              <Text style={estilos.textoLerReceita}>Ler receita</Text>
            </Pressable>
          </View>
        )}

        <Erro mensagem={erro} />

        {documentos === null ? (
          <ActivityIndicator color={paleta.tinta} style={{ marginTop: 24 }} />
        ) : lista.length === 0 ? (
          <Texto suave style={{ paddingHorizontal: 4 }}>
            {VAZIO[aba]}
          </Texto>
        ) : (
          <Cartao style={{ paddingVertical: 6, gap: 0 }}>
            {lista.map((d, i) => {
              const s = SELO[situacaoDoDocumento(d)];
              const destaque = d.tipo === 'receita' && d.status !== 'erro';
              return (
                <View key={d.id}>
                  {i > 0 && <Divisor />}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${d.titulo}, ${detalhe(d)}, ${s.texto}`}
                    onPress={() => abrir(d)}
                    style={({ pressed }) => [estilos.linha, pressed && { opacity: 0.7 }]}
                  >
                    <View style={[estilos.iconeDoc, { backgroundColor: destaque ? paleta.salvia.fundo : paleta.superficieNeutra }]}>
                      <IconeDocumento tamanho={22} cor={destaque ? paleta.salvia.forte : paleta.textoSuave} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={estilos.tituloDoc} numberOfLines={2}>
                        {d.titulo}
                      </Text>
                      <Text style={estilos.detalheDoc}>{detalhe(d)}</Text>
                    </View>
                    <Selo texto={s.texto} cor={s.cor} fundo={s.fundo} />
                  </Pressable>
                </View>
              );
            })}
          </Cartao>
        )}
      </ScrollView>
      <BarraNavegacao ativa="documentos" />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  conteudo: {
    padding: espacos.margemTelaFamilia,
    paddingTop: 24,
    gap: 14,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: ESPACO_BARRA + 24,
  },
  cabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, gap: 12 },
  sub: { fontFamily: fontes.texto, fontSize: 15, color: paleta.textoSuave },
  mais: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: paleta.primaria,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 12px 24px rgba(24,24,28,0.18)',
  },
  abas: { backgroundColor: paleta.cartao, borderRadius: 999, padding: 6, flexDirection: 'row', gap: 4, boxShadow: sombras.cartao },
  aba: { flex: 1, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  textoAba: { fontFamily: fontes.textoNegrito, fontSize: 15, color: paleta.textoSecundario },
  nova: { backgroundColor: paleta.lilas.fundo, borderRadius: 30, padding: 20, gap: 12 },
  iconeNova: { width: 44, height: 44, borderRadius: 22, backgroundColor: paleta.primaria, alignItems: 'center', justifyContent: 'center' },
  tituloNova: { fontFamily: fontes.destaque, fontSize: 20, color: paleta.tinta },
  textoNova: { fontFamily: fontes.texto, fontSize: 15, lineHeight: 21, color: paleta.lilas.texto },
  lerReceita: {
    alignSelf: 'flex-start',
    height: 44,
    backgroundColor: paleta.primaria,
    borderRadius: 22,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textoLerReceita: { fontFamily: fontes.textoNegrito, fontSize: 15, color: paleta.sobreTinta },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, minHeight: 48 },
  iconeDoc: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tituloDoc: { fontFamily: fontes.textoNegrito, fontSize: 16, color: paleta.tinta },
  detalheDoc: { fontFamily: fontes.texto, fontSize: 14, color: paleta.textoSuave },
});

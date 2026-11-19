// Adicionar documento (visual da Variação E, docs/design.md).
// Foto pela câmera ou arquivo/PDF → bucket "documentos" em <paciente_id>/<arquivo> → linha em documentos.
// Receita segue para "Confira a receita"; exame e relatório só ficam guardados.
import { NOME_TIPO, tituloDoDocumento, type TipoDocumento } from '@cuida/cliente';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  IconeCamera,
  IconeCheck,
  IconeDocumento,
  IconeEnviar,
  IconeFrasco,
  IconePilula,
  IconeSetaEsquerda,
} from '@/components/icones';
import { Botao, Campo, Erro, TituloPagina } from '@/components/ui';
import { enviarDocumento, escolherArquivo, tirarFoto, validarArquivo, type ArquivoEscolhido } from '@/lib/documentos';
import { usePaciente } from '@/lib/paciente';
import { espacos, fontes, paleta, sombras } from '@/lib/tema';

const OPCOES: { tipo: TipoDocumento; descricao: string; Icone: typeof IconePilula; fundo: string; cor: string; exemplo: string }[] = [
  { tipo: 'receita', descricao: 'A Lia lê e sugere os alarmes', Icone: IconePilula, fundo: paleta.lilas.fundo, cor: paleta.lilas.forte, exemplo: 'Ex.: Hematologia' },
  { tipo: 'exame', descricao: 'Sangue, imagem, laudos', Icone: IconeFrasco, fundo: paleta.salvia.fundo, cor: paleta.salvia.forte, exemplo: 'Ex.: Hemograma' },
  { tipo: 'relatorio', descricao: 'Consultas, altas, encaminhamentos', Icone: IconeDocumento, fundo: paleta.pessego.fundo, cor: paleta.pessego.texto, exemplo: 'Ex.: Consulta de retorno' },
];
const ABA: Record<TipoDocumento, string> = { receita: 'receitas', exame: 'exames', relatorio: 'relatorios' };

export default function Adicionar() {
  const { paciente } = usePaciente();
  const { tipo: tipoParam } = useLocalSearchParams<{ tipo?: string }>();
  const [tipo, setTipo] = useState<TipoDocumento>(
    tipoParam === 'exame' || tipoParam === 'relatorio' ? tipoParam : 'receita',
  );
  const [complemento, setComplemento] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!paciente) return null;
  const nome = paciente.apelido || paciente.nome;
  const opcao = OPCOES.find((o) => o.tipo === tipo)!;

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/documentos', params: { aba: ABA[tipo] } });
  }

  async function enviar(escolher: () => Promise<ArquivoEscolhido | { erro: string } | null>) {
    setErro(null);
    let arquivo: ArquivoEscolhido | { erro: string } | null;
    try {
      arquivo = await escolher();
    } catch {
      arquivo = { erro: 'Não foi possível abrir a câmera ou os arquivos.' };
    }
    if (!arquivo) return; // a família desistiu
    if ('erro' in arquivo) return setErro(arquivo.erro);
    const invalido = validarArquivo(tipo, arquivo);
    if (invalido) return setErro(invalido);

    setEnviando(true);
    const r = await enviarDocumento({
      pacienteId: paciente!.id,
      tipo,
      titulo: tituloDoDocumento(tipo, complemento),
      arquivo,
    });
    setEnviando(false);
    if ('erro' in r) return setErro(r.erro);
    if (tipo === 'receita') router.replace({ pathname: '/documentos/receita', params: { id: r.id } });
    else router.replace({ pathname: '/documentos', params: { aba: ABA[tipo] } });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: paleta.fundo }}>
      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar aos documentos"
          onPress={voltar}
          style={({ pressed }) => [estilos.voltar, pressed && { opacity: 0.8 }]}
        >
          <IconeSetaEsquerda tamanho={20} traco={2.2} cor={paleta.tinta} />
          <Text style={estilos.textoVoltar}>Documentos</Text>
        </Pressable>

        <View style={{ gap: 6, paddingHorizontal: 4 }}>
          <TituloPagina>Adicionar documento</TituloPagina>
          <Text style={estilos.sub}>O que você vai guardar?</Text>
        </View>

        <View style={{ gap: 10 }} accessibilityRole="radiogroup" aria-label="Tipo de documento">
          {OPCOES.map(({ tipo: t, descricao, Icone, fundo, cor }) => {
            const marcado = t === tipo;
            return (
              <Pressable
                key={t}
                accessibilityRole="radio"
                accessibilityState={{ checked: marcado }}
                accessibilityLabel={`${NOME_TIPO[t]}: ${descricao}`}
                onPress={() => setTipo(t)}
                style={[estilos.opcao, marcado && { borderColor: paleta.primaria }]}
              >
                <View style={[estilos.iconeOpcao, { backgroundColor: fundo }]}>
                  <Icone tamanho={24} cor={cor} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={estilos.nomeOpcao}>{NOME_TIPO[t]}</Text>
                  <Text style={estilos.descricao}>{descricao}</Text>
                </View>
                {marcado ? (
                  <View style={estilos.marcado}>
                    <IconeCheck tamanho={14} cor={paleta.sobreTinta} traco={3.2} />
                  </View>
                ) : (
                  <View style={estilos.desmarcado} />
                )}
              </Pressable>
            );
          })}
        </View>

        <Campo
          rotulo="Nome (opcional)"
          value={complemento}
          onChangeText={setComplemento}
          placeholder={opcao.exemplo}
          maxLength={80}
        />

        <View style={{ flexGrow: 1, minHeight: 8 }} />
        <Erro mensagem={erro} />
        {enviando ? (
          <View style={estilos.enviando} accessibilityLiveRegion="polite">
            <ActivityIndicator color={paleta.tinta} />
            <Text style={estilos.sub}>Enviando com segurança…</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <Botao
              titulo="Tirar foto"
              icone={<IconeCamera tamanho={22} cor={paleta.sobreTinta} traco={2.2} />}
              onPress={() => enviar(tirarFoto)}
            />
            <Botao
              variante="secundario"
              titulo="Escolher arquivo ou PDF"
              icone={<IconeEnviar tamanho={20} cor={paleta.tinta} />}
              onPress={() => enviar(escolherArquivo)}
            />
          </View>
        )}
        <Text style={estilos.rodape}>Os documentos ficam guardados só para a família de {nome}.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  conteudo: {
    flexGrow: 1,
    padding: espacos.margemTelaFamilia,
    paddingTop: 24,
    paddingBottom: 24,
    gap: 16,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  voltar: {
    alignSelf: 'flex-start',
    height: 48,
    backgroundColor: paleta.cartao,
    borderRadius: 24,
    paddingLeft: 12,
    paddingRight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    boxShadow: sombras.cartao,
  },
  textoVoltar: { fontFamily: fontes.textoNegrito, fontSize: 15, color: paleta.tinta },
  sub: { fontFamily: fontes.texto, fontSize: 15, color: paleta.textoSuave },
  opcao: {
    backgroundColor: paleta.cartao,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 26,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    boxShadow: sombras.cartao,
  },
  iconeOpcao: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  nomeOpcao: { fontFamily: fontes.textoNegrito, fontSize: 17, color: paleta.tinta },
  descricao: { fontFamily: fontes.texto, fontSize: 14, color: paleta.textoSuave },
  marcado: { width: 26, height: 26, borderRadius: 13, backgroundColor: paleta.primaria, alignItems: 'center', justifyContent: 'center' },
  desmarcado: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: paleta.salvia.borda },
  enviando: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 60 },
  rodape: { fontFamily: fontes.texto, fontSize: 13, lineHeight: 18, color: paleta.textoSuave, textAlign: 'center' },
});

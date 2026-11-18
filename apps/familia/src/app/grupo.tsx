// Grupo de cuidado (docs/PRD.md, seção 10, tela 7 da família; visual da Variação E).
// Quem acompanha, convites, papéis (passar a responsabilidade, remover, sair) e "seu nome no grupo".
import {
  codigoParaMostrar,
  linkDoConvite,
  mensagemDoConvite,
  nomeDoMembro,
  ordenarGrupo,
  rotuloDoPapel,
  type MembroDoGrupo,
} from '@cuida/cliente';
import {
  BotaoPrincipal,
  BotaoSecundario,
  Campo,
  Cartao,
  cores,
  espacos,
  fontes,
  IconePessoas,
  IconeVoltar,
  pasteis,
  Quadradinho,
  tamanhos,
} from '@cuida/visual';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  carregarMembros,
  criarConvite,
  passarResponsabilidade,
  sairOuRemover,
  salvarMeuNome,
} from '@/lib/grupo';
import { CartaoConsentimento } from '@/components/consentimento';
import { usePaciente } from '@/lib/paciente';
import { useSessao } from '@/lib/sessao';

const T = tamanhos.familia;

/** Confirmação simples (no navegador, a janela do próprio navegador). */
function confirmar(pergunta: string): boolean {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.confirm(pergunta);
  return true; // no celular nativo, o botão já é a confirmação (MVP é web)
}

export default function Grupo() {
  const { paciente, papel, recarregar } = usePaciente();
  const { sessao } = useSessao();
  const eu = sessao?.user.id ?? '';
  const [membros, setMembros] = useState<MembroDoGrupo[]>([]);
  const [meuNome, setMeuNome] = useState('');
  const [codigo, setCodigo] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    if (!paciente) return;
    const lista = await carregarMembros(paciente.id);
    setMembros(ordenarGrupo(lista));
    setMeuNome((n) => n || lista.find((m) => m.usuario_id === eu)?.nome_exibicao || '');
  }, [paciente, eu]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (!paciente) return null;
  const nome = paciente.apelido || paciente.nome;
  const souResponsavel = papel === 'principal';

  async function executar(acao: () => Promise<string | null>, sucesso: string) {
    setAviso(null);
    setOcupado(true);
    const erro = await acao();
    setOcupado(false);
    setAviso(erro ?? sucesso);
    await carregar();
    await recarregar();
  }

  async function gerarConvite() {
    setAviso(null);
    setOcupado(true);
    const r = await criarConvite(paciente!.id);
    setOcupado(false);
    if (r.erro) return setAviso(r.erro);
    setCodigo(r.codigo ?? null);
  }

  async function compartilhar() {
    if (!codigo) return;
    const mensagem = mensagemDoConvite(nome, codigo, linkDoConvite(codigo));
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}>
      <ScrollView contentContainerStyle={estilos.tela} keyboardShouldPersistTaps="handled">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar aos ajustes"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/ajustes'))}
          style={({ pressed }) => [estilos.voltar, pressed && { opacity: 0.8 }]}
        >
          <IconeVoltar tamanho={20} cor={cores.texto} />
          <Text style={estilos.textoVoltar}>Ajustes</Text>
        </Pressable>

        <Text style={estilos.titulo} accessibilityRole="header">
          Grupo de cuidado de {nome}
        </Text>
        <Text style={estilos.texto}>
          Alertas críticos vão primeiro para o responsável principal. Se ele não agir a tempo, todo o grupo é
          avisado. Emergências vão para todos na hora.
        </Text>

        {paciente ? <CartaoConsentimento paciente={paciente} papel={papel} completo /> : null}

        {aviso ? (
          <Text style={estilos.aviso} accessibilityLiveRegion="polite">
            {aviso}
          </Text>
        ) : null}

        <Cartao style={{ gap: 14 }}>
          <Text style={estilos.subtitulo}>Quem acompanha</Text>
          {membros.map((m) => {
            const voce = m.usuario_id === eu;
            return (
              <View key={m.usuario_id} style={{ gap: 10 }}>
                <View style={estilos.linha}>
                  <Quadradinho pastel={m.papel === 'principal' ? 'menta' : 'amarelo'} tamanho={44}>
                    <IconePessoas cor={m.papel === 'principal' ? pasteis.menta.icone : pasteis.amarelo.icone} />
                  </Quadradinho>
                  <View style={{ flex: 1 }}>
                    <Text style={estilos.negrito}>
                      {nomeDoMembro(m)}
                      {voce ? ' (você)' : ''}
                    </Text>
                    <Text style={estilos.rotulo}>{rotuloDoPapel(m.papel)}</Text>
                  </View>
                </View>
                {souResponsavel && !voce ? (
                  <View style={estilos.acoes}>
                    <BotaoSecundario
                      tamanho="familia"
                      rotulo="Tornar responsável"
                      desabilitado={ocupado}
                      onPress={() =>
                        confirmar(`Passar a responsabilidade para ${nomeDoMembro(m)}? Você vira acompanhante.`) &&
                        executar(() => passarResponsabilidade(paciente.id, m.usuario_id), `${nomeDoMembro(m)} agora é o responsável principal.`)
                      }
                    />
                    <BotaoSecundario
                      tamanho="familia"
                      rotulo="Remover"
                      desabilitado={ocupado}
                      onPress={() =>
                        confirmar(`Remover ${nomeDoMembro(m)} do grupo?`) &&
                        executar(() => sairOuRemover(paciente.id, m.usuario_id), `${nomeDoMembro(m)} saiu do grupo.`)
                      }
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
        </Cartao>

        {souResponsavel ? (
          <Cartao style={{ gap: 12 }}>
            <Text style={estilos.subtitulo}>Convidar alguém</Text>
            <Text style={estilos.texto}>
              A pessoa entra como acompanhante: vê o painel, os remédios e os alertas, mas não muda a rotina de
              remédios. Cada convite serve para uma pessoa e vale por 7 dias.
            </Text>
            {codigo ? (
              <View style={estilos.codigoCaixa}>
                <Text style={estilos.rotulo}>Código do convite</Text>
                <Text style={estilos.codigo} selectable>
                  {codigoParaMostrar(codigo)}
                </Text>
                <Text style={estilos.rotulo} selectable>
                  {linkDoConvite(codigo)}
                </Text>
              </View>
            ) : null}
            {codigo ? (
              <BotaoPrincipal tamanho="familia" rotulo="Enviar convite" onPress={compartilhar} />
            ) : (
              <BotaoPrincipal tamanho="familia" rotulo={ocupado ? 'Gerando…' : 'Gerar convite'} onPress={gerarConvite} desabilitado={ocupado} />
            )}
          </Cartao>
        ) : null}

        <Cartao style={{ gap: 12 }}>
          <Text style={estilos.subtitulo}>Seu nome no grupo</Text>
          <Campo rotulo="Como os outros veem você" value={meuNome} onChangeText={setMeuNome} placeholder="Ex.: Lucas (neto)" />
          <BotaoSecundario
            tamanho="familia"
            rotulo="Salvar nome"
            desabilitado={ocupado}
            onPress={() => executar(() => salvarMeuNome(paciente.id, eu, meuNome), 'Nome salvo.')}
          />
        </Cartao>

        {!souResponsavel ? (
          <BotaoSecundario
            tamanho="familia"
            rotulo="Sair do grupo"
            desabilitado={ocupado}
            onPress={async () => {
              if (!confirmar(`Sair do grupo de cuidado de ${nome}? Você deixa de receber os alertas.`)) return;
              const erro = await sairOuRemover(paciente.id, eu);
              if (erro) return setAviso(erro);
              await recarregar();
              router.replace('/');
            }}
          />
        ) : null}
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
  aviso: { fontFamily: fontes.textoNegrito, fontSize: T.texto, lineHeight: 23, color: cores.primariaEscura },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  codigoCaixa: {
    gap: 4,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: pasteis.menta.borda,
    backgroundColor: pasteis.menta.fundo,
    alignItems: 'center',
  },
  codigo: { fontFamily: fontes.titulo, fontSize: 40, letterSpacing: 4, color: cores.primariaEscura },
});

// Tela do alerta da família (docs/PRD.md, seção 10, tela 6; visual da Variação E, docs/design.md).
// O que aconteceu, a escalada, "Reenviar lembrete", "Ligar para o idoso" e "Já falei com..., está tudo bem".
// Confirmar a dose ou fazer o check-in resolve o alerta sozinho (gatilhos no banco).
import {
  dividirMotivo,
  horaCurta,
  linkDeLigacao,
  resumoDoCheckin,
  situacaoDaEscalada,
  telefoneFormatado,
  textoDaResolucao,
  type AlertaLinha,
  type CheckinLinha,
  type Paciente,
  type PessoaDoGrupo,
} from '@cuida/cliente';
import { temposDoPaciente } from '@cuida/regras';
import {
  BotaoPrincipal,
  BotaoSecundario,
  Cartao,
  cores,
  espacos,
  fontes,
  IconeConfirmado,
  IconePessoas,
  IconeSino,
  IconeTelefone,
  IconeVoltar,
  pasteis,
  Quadradinho,
  tamanhos,
} from '@cuida/visual';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { carregarGrupo, reenviarLembrete, resolverPelaFamilia, type ResultadoReenvio } from '@/lib/alertas';

const T = tamanhos.familia;

const TIPO: Record<AlertaLinha['nivel'], string> = {
  vermelho: 'Emergência',
  laranja: 'Alerta crítico',
  amarelo: 'Aviso',
  informativo: 'Registro',
};

function mensagemDoReenvio(r: ResultadoReenvio, nome: string): string {
  switch (r.tipo) {
    case 'enviado':
      return `Lembrete reenviado para o celular de ${nome}. O grupo só será avisado se ninguém resolver até o novo horário.`;
    case 'sem_avisos':
      return `O celular de ${nome} ainda não ativou os avisos do Cuida. Tente ligar.`;
    case 'resolvido':
      return 'Este alerta já foi resolvido.';
    case 'sem_celular':
      return `O celular de ${nome} ainda não está vinculado. Vincule em Ajustes.`;
    default:
      return r.mensagem;
  }
}

export function TelaAlerta({
  alerta,
  paciente,
  usuarioId,
  ultimoCheckin,
  onVoltar,
  onAtualizar,
}: {
  alerta: AlertaLinha;
  paciente: Paciente;
  usuarioId: string | undefined;
  ultimoCheckin: CheckinLinha | null;
  onVoltar: () => void;
  /** Recarrega os alertas (depois de reenviar ou resolver). */
  onAtualizar: () => Promise<void> | void;
}) {
  const nome = paciente.apelido || paciente.nome;
  const [grupo, setGrupo] = useState<PessoaDoGrupo[]>([]);
  const [ocupado, setOcupado] = useState<'reenviar' | 'resolver' | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    carregarGrupo(alerta.paciente_id).then(setGrupo);
  }, [alerta.paciente_id]);

  const { titulo, detalhe } = dividirMotivo(alerta.motivo);
  const resolvido = textoDaResolucao(alerta, nome);
  const escalada = situacaoDaEscalada(alerta, grupo, temposDoPaciente(paciente), usuarioId ?? '');
  const hoje =
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(alerta.criado_em)) ===
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  // Check-in até 3 h antes do alerta ajuda a entender o que aconteceu.
  const checkin =
    ultimoCheckin && Math.abs(Date.parse(alerta.criado_em) - Date.parse(ultimoCheckin.feito_em)) < 3 * 3_600_000
      ? ultimoCheckin
      : null;
  const sintomas = checkin ? resumoDoCheckin(checkin) : [];

  async function reenviar() {
    setAviso(null);
    setOcupado('reenviar');
    const r = await reenviarLembrete(alerta.id);
    setOcupado(null);
    setAviso(mensagemDoReenvio(r, nome));
    await onAtualizar();
  }

  async function resolver() {
    setAviso(null);
    setOcupado('resolver');
    const erro = await resolverPelaFamilia(alerta.id, usuarioId);
    setOcupado(null);
    if (erro) return setAviso('Não foi possível salvar agora. Tente de novo.');
    await onAtualizar();
    onVoltar();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}>
      <ScrollView contentContainerStyle={estilos.tela}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar ao início"
          onPress={onVoltar}
          style={({ pressed }) => [estilos.voltar, pressed && { opacity: 0.8 }]}
        >
          <IconeVoltar tamanho={20} cor={cores.texto} />
          <Text style={estilos.textoVoltar}>Início</Text>
        </Pressable>

        <View style={estilos.cabecalho}>
          <View style={estilos.linha}>
            <View style={estilos.selo}>
              <Text style={estilos.textoSelo}>{TIPO[alerta.nivel]}</Text>
            </View>
            <Text style={estilos.quando}>
              {hoje ? 'Hoje' : new Date(alerta.criado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })},{' '}
              {horaCurta(alerta.criado_em)}
            </Text>
          </View>
          <Text style={estilos.titulo} accessibilityRole="header">
            {titulo}
          </Text>
          {detalhe ? <Text style={estilos.detalhe}>{detalhe}</Text> : null}
        </View>

        {resolvido ? (
          <Cartao pastel="menta" style={estilos.linhaCartao}>
            <Quadradinho pastel="menta" tamanho={44}>
              <IconeConfirmado cor={pasteis.menta.icone} />
            </Quadradinho>
            <Text style={[estilos.texto, { flex: 1 }]}>
              <Text style={estilos.negrito}>Resolvido. </Text>
              {resolvido}
            </Text>
          </Cartao>
        ) : null}

        {checkin ? (
          <Cartao style={{ gap: 8 }}>
            <Text style={estilos.rotulo}>O que {nome} contou à Lia · {horaCurta(checkin.feito_em)}</Text>
            {checkin.notas ? <Text style={estilos.fala}>{checkin.notas}</Text> : null}
            {sintomas.length > 0 ? <Text style={estilos.texto}>{sintomas.join(' · ')}</Text> : null}
          </Cartao>
        ) : null}

        <Cartao style={{ gap: 12 }}>
          <Text style={estilos.subtitulo}>Quem foi avisado</Text>
          {escalada.avisados.length === 0 ? (
            <Text style={estilos.texto}>Ninguém recebeu notificação deste aviso.</Text>
          ) : (
            escalada.avisados.map((p) => (
              <View key={p.nome} style={estilos.linhaCartao}>
                <Quadradinho pastel="amarelo" tamanho={44}>
                  <IconePessoas cor={pasteis.amarelo.icone} />
                </Quadradinho>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.negrito}>
                    {p.nome}
                    {p.principal ? ' · responsável principal' : ''}
                  </Text>
                  <Text style={estilos.rotulo}>Avisado às {horaCurta(alerta.criado_em)}</Text>
                </View>
              </View>
            ))
          )}
          <Text style={estilos.texto}>{escalada.texto}</Text>
        </Cartao>

        {!alerta.visto_em ? (
          <View style={{ gap: 12 }}>
            {aviso ? (
              <Text style={estilos.aviso} accessibilityLiveRegion="polite">
                {aviso}
              </Text>
            ) : null}
            {paciente.usuario_id ? (
              <BotaoPrincipal
                tamanho="familia"
                rotulo={ocupado === 'reenviar' ? 'Reenviando…' : 'Reenviar lembrete'}
                icone={<IconeSino cor={cores.sobrePrimaria} />}
                onPress={reenviar}
                desabilitado={ocupado !== null}
              />
            ) : null}
            <BotaoSecundario
              tamanho="familia"
              rotulo={paciente.telefone ? `Ligar para ${nome}` : `Ligar para ${nome} (sem telefone)`}
              icone={<IconeTelefone cor={cores.primaria} />}
              onPress={() => paciente.telefone && Linking.openURL(linkDeLigacao(paciente.telefone))}
              desabilitado={!paciente.telefone}
            />
            {paciente.telefone ? (
              <Text style={estilos.rotulo}>{telefoneFormatado(paciente.telefone)}</Text>
            ) : (
              <Text style={estilos.rotulo}>Cadastre o telefone de {nome} em Ajustes para ligar daqui.</Text>
            )}
            <BotaoPrincipal
              tamanho="familia"
              rotulo={ocupado === 'resolver' ? 'Salvando…' : `Já falei com ${nome}, está tudo bem`}
              icone={<IconeConfirmado cor={cores.sobrePrimaria} />}
              onPress={resolver}
              desabilitado={ocupado !== null}
            />
          </View>
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
  cabecalho: {
    backgroundColor: cores.alertaFundo,
    borderColor: cores.alertaBorda,
    borderWidth: 1.5,
    borderRadius: 26,
    padding: 20,
    gap: 10,
  },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  selo: { backgroundColor: cores.alertaForte, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  textoSelo: { fontFamily: fontes.textoNegrito, fontSize: T.minimo, color: cores.superficie },
  quando: { fontFamily: fontes.texto, fontSize: T.texto, color: cores.alertaTexto },
  titulo: { fontFamily: fontes.titulo, fontSize: T.titulo, lineHeight: T.titulo * 1.2, color: cores.alertaTexto },
  detalhe: { fontFamily: fontes.texto, fontSize: T.texto, lineHeight: 23, color: cores.alertaTexto },
  linhaCartao: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subtitulo: { fontFamily: fontes.titulo, fontSize: 20, color: cores.texto },
  texto: { fontFamily: fontes.texto, fontSize: T.texto, lineHeight: 23, color: cores.texto },
  negrito: { fontFamily: fontes.textoNegrito, fontSize: T.texto, color: cores.texto },
  rotulo: { fontFamily: fontes.texto, fontSize: T.minimo + 1, color: cores.textoSuave },
  fala: { fontFamily: fontes.titulo, fontSize: 22, lineHeight: 28, color: cores.texto },
  aviso: { fontFamily: fontes.textoNegrito, fontSize: T.texto, lineHeight: 23, color: cores.primariaEscura },
});

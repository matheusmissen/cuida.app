// Aceitar um convite para o grupo de cuidado (docs/PRD.md, seção 2; visual da Variação E).
// Link: /convite?codigo=K7M4QX. Sem conta ainda: o código fica guardado, a pessoa entra ou cria a conta
// e volta para cá sozinha (o _layout lê o convite pendente depois do login).
import { codigoParaMostrar, lerCodigoDoConvite } from '@cuida/cliente';
import { BotaoPrincipal, BotaoSecundario, Campo, Cartao, cores, espacos, fontes, tamanhos } from '@cuida/visual';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { aceitarConvite, guardarConvitePendente, lerConvitePendente } from '@/lib/grupo';
import { usePaciente } from '@/lib/paciente';
import { useSessao } from '@/lib/sessao';

const T = tamanhos.familia;

export default function Convite() {
  const { codigo: doLink } = useLocalSearchParams<{ codigo?: string }>();
  const { sessao } = useSessao();
  const { recarregar } = usePaciente();
  const [codigo, setCodigo] = useState(doLink ?? '');
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Código do link guardado (para depois do login) ou recuperado (voltou do login).
  useEffect(() => {
    if (doLink) guardarConvitePendente(doLink);
    else lerConvitePendente().then((c) => c && setCodigo((atual) => atual || c));
  }, [doLink]);

  async function aceitar() {
    setErro(null);
    const lido = lerCodigoDoConvite(codigo);
    if (!lido) return setErro('Código inválido. São 6 letras e números, por exemplo K7M 4QX.');
    if (nome.trim().length < 2) return setErro('Diga seu nome, para o grupo saber quem é você.');
    setEnviando(true);
    const falha = await aceitarConvite(lido, nome);
    setEnviando(false);
    if (falha) return setErro(/inválido|vencido/i.test(falha) ? 'Convite inválido, já usado ou vencido. Peça um novo.' : falha);
    await guardarConvitePendente(null);
    await recarregar();
    router.replace('/');
  }

  const lido = lerCodigoDoConvite(codigo);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}>
      <ScrollView contentContainerStyle={estilos.tela} keyboardShouldPersistTaps="handled">
        <Text style={estilos.titulo} accessibilityRole="header">
          Convite para o grupo de cuidado
        </Text>
        {!sessao ? (
          <Cartao style={{ gap: 12 }}>
            <Text style={estilos.texto}>
              {lido ? `Seu código: ${codigoParaMostrar(lido)}. ` : ''}Primeiro entre na sua conta ou crie uma. Depois
              você volta para cá e confirma.
            </Text>
            <BotaoPrincipal tamanho="familia" rotulo="Entrar ou criar conta" onPress={() => router.replace('/entrar')} />
          </Cartao>
        ) : (
          <Cartao style={{ gap: 12 }}>
            <Text style={estilos.texto}>
              Você vai entrar como acompanhante: vê o painel, os remédios e os alertas, e recebe os avisos
              quando o responsável principal não puder agir.
            </Text>
            <Campo rotulo="Código do convite" value={codigo} onChangeText={setCodigo} placeholder="K7M 4QX" autoCapitalize="characters" />
            <Campo rotulo="Seu nome" value={nome} onChangeText={setNome} placeholder="Ex.: Ana (filha)" />
            {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
            <BotaoPrincipal tamanho="familia" rotulo={enviando ? 'Entrando…' : 'Entrar no grupo'} onPress={aceitar} desabilitado={enviando} />
            <BotaoSecundario
              tamanho="familia"
              rotulo="Agora não"
              onPress={async () => {
                await guardarConvitePendente(null); // não volta para o convite a cada login
                router.replace('/');
              }}
            />
          </Cartao>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: {
    flexGrow: 1,
    padding: espacos.lateral,
    paddingTop: 32,
    gap: espacos.bloco,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  titulo: { fontFamily: fontes.titulo, fontSize: T.titulo, lineHeight: T.titulo * 1.2, color: cores.texto },
  texto: { fontFamily: fontes.texto, fontSize: T.texto, lineHeight: 23, color: cores.texto },
  erro: { fontFamily: fontes.textoNegrito, fontSize: T.texto, color: cores.alertaTexto },
});

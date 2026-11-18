// Tela 1 do idoso: "Instalar o Cuida" (docs/PRD.md, seção 3 e seção 10; visual da Variação E).
// Passo a passo conforme o celular: iPhone (Safari → Compartilhar → Adicionar à Tela de Início),
// Android (botão "Instalar o Cuida" ou menu do Chrome) e link aberto dentro do WhatsApp (abrir no navegador).
// Letras de 20 px ou mais e botões grandes (regras do app do idoso).
import { LINK_DO_APP_DO_IDOSO } from '@cuida/cliente';
import {
  BotaoPrincipal,
  BotaoSecundario,
  Cartao,
  cores,
  espacos,
  fontes,
  IconeAdicionar,
  IconeCasa,
  IconeCompartilhar,
  IconeMenu,
  Paisagem,
  paisagem,
  pasteis,
  Quadradinho,
  usePeriodo,
  type IconeProps,
  type Pastel,
} from '@cuida/visual';
import { useState, type ComponentType } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { EstadoInstalacao } from '@/lib/instalacao';

interface Passo {
  Icone: ComponentType<IconeProps>;
  pastel: Pastel;
  texto: string;
}

function Passos({ passos }: { passos: Passo[] }) {
  return (
    <View style={{ gap: 12 }}>
      {passos.map((p, i) => (
        <Cartao key={i} style={estilos.passo}>
          <Quadradinho pastel={p.pastel} tamanho={56}>
            <p.Icone tamanho={28} cor={pasteis[p.pastel].icone} />
          </Quadradinho>
          <Text style={[estilos.texto, { flex: 1 }]}>
            <Text style={estilos.numero}>{i + 1}. </Text>
            {p.texto}
          </Text>
        </Cartao>
      ))}
    </View>
  );
}

export function TelaInstalar({ instalacao }: { instalacao: EstadoInstalacao }) {
  const periodo = usePeriodo();
  const { navegador, temBotao, acabouDeInstalar } = instalacao;
  const [copiado, setCopiado] = useState(false);
  const app = navegador.nomeDoApp ?? 'outro aplicativo';
  const navegadorCerto = navegador.sistema === 'ios' ? 'Safari' : 'Chrome';

  async function copiarLink() {
    try {
      await (globalThis.navigator as Navigator).clipboard.writeText(LINK_DO_APP_DO_IDOSO);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  let conteudo;
  if (acabouDeInstalar) {
    conteudo = (
      <Cartao pastel="menta" style={{ gap: 8 }}>
        <Text style={estilos.subtitulo}>Pronto, o Cuida foi instalado!</Text>
        <Text style={estilos.texto}>Agora feche esta página e abra o Cuida pelo ícone novo na tela do celular.</Text>
      </Cartao>
    );
  } else if (navegador.dentroDeApp) {
    conteudo = (
      <>
        <Text style={estilos.texto}>
          Este link abriu dentro do {app}, que não instala aplicativos. Abra o link no {navegadorCerto}:
        </Text>
        <Passos
          passos={[
            {
              Icone: navegador.sistema === 'ios' ? IconeCompartilhar : IconeMenu,
              pastel: 'amarelo',
              texto:
                navegador.sistema === 'ios'
                  ? `Toque no botão de compartilhar ou nos três pontinhos e escolha "Abrir no Safari".`
                  : `Toque nos três pontinhos no canto da tela e escolha "Abrir no Chrome".`,
            },
            { Icone: IconeAdicionar, pastel: 'menta', texto: 'Lá, siga o passo a passo para instalar o Cuida.' },
          ]}
        />
        <Text style={estilos.texto}>Se não achar, copie o link e cole no {navegadorCerto}:</Text>
        <BotaoSecundario rotulo={copiado ? 'Link copiado' : 'Copiar o link'} onPress={copiarLink} />
      </>
    );
  } else if (navegador.sistema === 'ios') {
    conteudo = (
      <>
        <Text style={estilos.texto}>No iPhone, o Cuida funciona instalado na tela de início. São 3 passos:</Text>
        <Passos
          passos={[
            { Icone: IconeCompartilhar, pastel: 'lilas', texto: 'Toque no botão Compartilhar, na barra do Safari (o quadrado com a seta para cima).' },
            { Icone: IconeAdicionar, pastel: 'menta', texto: 'Desça a lista e toque em "Adicionar à Tela de Início". Depois toque em "Adicionar".' },
            { Icone: IconeCasa, pastel: 'amarelo', texto: 'Feche o Safari e abra o Cuida pelo ícone novo na tela do celular.' },
          ]}
        />
      </>
    );
  } else {
    conteudo = (
      <>
        {temBotao ? (
          <>
            <Text style={estilos.texto}>Toque no botão para instalar o Cuida no seu celular:</Text>
            <BotaoPrincipal rotulo="Instalar o Cuida" onPress={instalacao.instalar} />
            <Text style={estilos.texto}>Depois, abra o Cuida pelo ícone novo na tela do celular.</Text>
          </>
        ) : (
          <>
            <Text style={estilos.texto}>Para instalar o Cuida no seu celular:</Text>
            <Passos
              passos={[
                { Icone: IconeMenu, pastel: 'lilas', texto: 'Toque nos três pontinhos, no canto de cima do Chrome.' },
                { Icone: IconeAdicionar, pastel: 'menta', texto: 'Toque em "Instalar app" ou "Adicionar à tela inicial".' },
                { Icone: IconeCasa, pastel: 'amarelo', texto: 'Abra o Cuida pelo ícone novo na tela do celular.' },
              ]}
            />
          </>
        )}
      </>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Paisagem altura={190}>
          <Text style={[estilos.titulo, { color: paisagem[periodo].texto }]} accessibilityRole="header">
            Boas-vindas ao Cuida
          </Text>
          <Text style={[estilos.texto, { color: paisagem[periodo].texto }]}>Vamos colocar o Cuida no seu celular.</Text>
        </Paisagem>
        <View style={estilos.miolo}>
          {conteudo}
          <View style={{ height: 8 }} />
          <BotaoSecundario rotulo="Continuar sem instalar" onPress={instalacao.dispensar} />
          <Text style={estilos.nota}>Sem instalar, o Cuida não consegue avisar a hora do remédio com o celular bloqueado.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  miolo: { padding: espacos.lateral, gap: espacos.bloco, maxWidth: 640, width: '100%', alignSelf: 'center' },
  titulo: { fontFamily: fontes.titulo, fontSize: 32, lineHeight: 38 },
  subtitulo: { fontFamily: fontes.titulo, fontSize: 24, color: cores.texto },
  texto: { fontFamily: fontes.texto, fontSize: 21, lineHeight: 29, color: cores.texto },
  numero: { fontFamily: fontes.titulo, fontSize: 21, color: cores.primaria },
  nota: { fontFamily: fontes.texto, fontSize: 20, lineHeight: 27, color: cores.textoSuave },
  passo: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
});

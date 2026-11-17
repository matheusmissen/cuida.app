// Página de demonstração da Variação E (só para conferência; nenhuma tela do app aponta para cá).
// Abra /vitrine no navegador para ver todos os componentes base de @cuida/visual.
import {
  BarraAbas,
  BotaoPrincipal,
  BotaoSecundario,
  Campo,
  Cartao,
  chamaLia,
  cores,
  espacos,
  fontes,
  GradeRostinhos,
  IconeCalendario,
  IconeCasa,
  IconeConversa,
  IconePessoas,
  IconePilula,
  Paisagem,
  paisagem,
  pasteis,
  periodoDoDia,
  Quadradinho,
  rostinhos,
  saudacao,
  tamanhos,
  usePeriodo,
  type NivelRostinho,
  type Pastel,
} from '@cuida/visual';
import { Stack } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={estilos.secao}>
      <Text style={estilos.tituloSecao} accessibilityRole="header">
        {titulo}
      </Text>
      {children}
    </View>
  );
}

const Corpo = ({ children, cor = cores.texto }: { children: ReactNode; cor?: string }) => (
  <Text style={[estilos.corpo, { color: cor }]}>{children}</Text>
);

const AMOSTRAS: [string, string][] = [
  ['fundo', cores.fundo],
  ['superficie', cores.superficie],
  ['borda', cores.borda],
  ['texto', cores.texto],
  ['texto-suave', cores.textoSuave],
  ['primaria', cores.primaria],
  ['primaria-escura', cores.primariaEscura],
  ['alerta-fundo', cores.alertaFundo],
  ['alerta-forte', cores.alertaForte],
  ['alerta-texto', cores.alertaTexto],
];

const PASTEIS: { pastel: Pastel; nome: string; Icone: typeof IconeCasa }[] = [
  { pastel: 'lilas', nome: 'Remédios', Icone: IconePilula },
  { pastel: 'menta', nome: 'Consultas', Icone: IconeCalendario },
  { pastel: 'pessego', nome: 'Lia', Icone: IconeConversa },
  { pastel: 'amarelo', nome: 'Família', Icone: IconePessoas },
];

type AbaDemo = 'inicio' | 'remedios' | 'consultas' | 'grupo';

export default function Vitrine() {
  const [nivel, setNivel] = useState<NivelRostinho | null>(null);
  const [aba, setAba] = useState<AbaDemo>('inicio');
  const [nome, setNome] = useState('');
  const periodo = usePeriodo();
  const agora = new Date();

  return (
    <>
      <Stack.Screen options={{ title: 'Vitrine · Variação E' }} />
      <ScrollView style={estilos.tela} contentContainerStyle={estilos.conteudo}>
        <Paisagem agua altura={220}>
          <Text style={[estilos.saudacao, { color: paisagem[periodo].texto }]}>{saudacao(agora)}, Dona Maria</Text>
          <Text style={[estilos.corpo, { color: paisagem[periodo].texto }]}>
            Automática: agora é {periodoDoDia(agora)} aqui.
          </Text>
        </Paisagem>

        <View style={estilos.miolo}>
          <Text style={estilos.tituloPagina} accessibilityRole="header">
            Vitrine da Variação E
          </Text>
          <Corpo cor={cores.textoSuave}>
            Página só para conferência. Mostra os componentes base de docs/design.md; nenhuma tela do app usa isto ainda.
          </Corpo>

          <Secao titulo="Cores">
            <View style={estilos.amostras}>
              {AMOSTRAS.map(([nomeCor, hex]) => (
                <View key={nomeCor} style={estilos.amostra}>
                  <View style={[estilos.bolinha, { backgroundColor: hex }]} />
                  <Text style={estilos.legenda}>
                    {nomeCor}
                    {'\n'}
                    {hex}
                  </Text>
                </View>
              ))}
            </View>
          </Secao>

          <Secao titulo="Tipografia">
            <Text style={[estilos.titulo, { fontSize: tamanhos.idoso.titulo }]}>Título do idoso (Nunito 800, 32)</Text>
            <Text style={[estilos.titulo, { fontSize: tamanhos.idoso.horario }]}>08:00</Text>
            <Corpo>Texto corrido do idoso em Atkinson Hyperlegible, 19 px.</Corpo>
            <Text style={[estilos.titulo, { fontSize: tamanhos.familia.titulo }]}>Título da família (27)</Text>
            <Text style={[estilos.corpo, { fontSize: tamanhos.familia.texto }]}>Texto da família, 16 px.</Text>
          </Secao>

          <Secao titulo="Botões">
            <BotaoPrincipal rotulo="Tomei" tamanho="tomei" />
            <BotaoPrincipal rotulo="Falar com a Lia" icone={<IconeConversa cor={cores.sobrePrimaria} />} />
            <BotaoSecundario rotulo="Me lembre daqui a 10 minutos" />
            <BotaoPrincipal rotulo="Salvar remédio (família, 56 px)" tamanho="familia" />
            <BotaoSecundario rotulo="Cancelar (família)" tamanho="familia" />
            <BotaoPrincipal rotulo="Desabilitado" desabilitado />
          </Secao>

          <Secao titulo="Cartões">
            <Cartao>
              <Text style={[estilos.titulo, { fontSize: 22 }]}>Cartão comum</Text>
              <Corpo>Fundo branco, borda 1,5 px e cantos de 26 px.</Corpo>
            </Cartao>
            <Cartao destaque>
              <Text style={[estilos.titulo, { fontSize: 22 }]}>Cartão em destaque</Text>
              <Corpo>Borda de 2,5 px verde-petróleo (item selecionado ou formulário ativo).</Corpo>
            </Cartao>
            <View style={estilos.linhaPasteis}>
              {PASTEIS.map(({ pastel, nome: rotulo, Icone }) => (
                <Cartao key={pastel} pastel={pastel} style={estilos.cartaoPastel}>
                  <Quadradinho pastel={pastel}>
                    <Icone cor={pasteis[pastel].icone} tamanho={26} />
                  </Quadradinho>
                  <Text style={[estilos.legendaForte, { color: pasteis[pastel].icone }]}>{rotulo}</Text>
                </Cartao>
              ))}
            </View>
            <Cartao style={{ backgroundColor: cores.alertaFundo, borderColor: cores.alertaBorda }}>
              <View style={estilos.selo}>
                <Text style={estilos.seloTexto}>Alerta crítico</Text>
              </View>
              <Corpo cor={cores.alertaTexto}>Dose das 8h ainda não confirmada.</Corpo>
            </Cartao>
          </Secao>

          <Secao titulo="Campos de texto">
            <Campo rotulo="Nome do remédio" placeholder="Ex.: Losartana" value={nome} onChangeText={setNome} />
            <Campo rotulo="Código de acesso (idoso)" app="idoso" placeholder="0000" keyboardType="number-pad" />
            <Campo rotulo="Telefone" placeholder="(11) 90000-0000" erro="Confira o número: faltam dígitos." />
          </Secao>

          <Secao titulo="Check-in: rostinhos">
            <Text style={[estilos.titulo, { fontSize: tamanhos.idoso.titulo }]}>Como você está hoje?</Text>
            <GradeRostinhos valor={nivel} aoEscolher={setNivel} />
            <Corpo cor={cores.textoSuave}>
              {nivel
                ? `Escolhido: ${rostinhos[nivel].rotulo}. ${chamaLia(nivel) ? 'A Lia entraria na conversa.' : 'Não chama a Lia.'}`
                : 'Toque num rostinho.'}
            </Corpo>
          </Secao>

          <Secao titulo="Paisagem dia e noite">
            <Paisagem formato="cartao" periodo="dia" altura={180}>
              <Text style={[estilos.saudacao, { color: paisagem.dia.texto }]}>Bom dia</Text>
              <View style={estilos.botaoNaPaisagem}>
                <BotaoPrincipal rotulo="Começar" />
              </View>
            </Paisagem>
            <Paisagem formato="cartao" periodo="noite" altura={180} agua>
              <Text style={[estilos.saudacao, { color: paisagem.noite.texto }]}>Boa noite</Text>
              <View style={estilos.botaoNaPaisagem}>
                <BotaoPrincipal rotulo="Começar" sobreNoite />
              </View>
            </Paisagem>
          </Secao>

          <Secao titulo="Barra de abas">
            <Cartao style={{ padding: 0, overflow: 'hidden' }}>
              <View style={{ padding: 18 }}>
                <Corpo>Aba ativa: {aba}</Corpo>
              </View>
              <BarraAbas<AbaDemo>
                ativa={aba}
                aoTrocar={setAba}
                abas={[
                  { chave: 'inicio', rotulo: 'Início', Icone: IconeCasa },
                  { chave: 'remedios', rotulo: 'Remédios', Icone: IconePilula },
                  { chave: 'consultas', rotulo: 'Consultas', Icone: IconeCalendario, novidades: 2 },
                  { chave: 'grupo', rotulo: 'Grupo', Icone: IconePessoas },
                ]}
              />
            </Cartao>
          </Secao>
        </View>
      </ScrollView>
    </>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { paddingBottom: 48 },
  miolo: { paddingHorizontal: espacos.lateral, paddingTop: espacos.bloco, gap: espacos.bloco, maxWidth: 640, width: '100%', alignSelf: 'center' },
  tituloPagina: { fontFamily: fontes.titulo, fontSize: tamanhos.idoso.titulo, color: cores.texto },
  secao: { gap: espacos.medio, marginTop: espacos.bloco },
  tituloSecao: { fontFamily: fontes.titulo, fontSize: 24, color: cores.primaria },
  titulo: { fontFamily: fontes.titulo, color: cores.texto },
  saudacao: { fontFamily: fontes.titulo, fontSize: tamanhos.idoso.titulo },
  corpo: { fontFamily: fontes.texto, fontSize: tamanhos.idoso.texto, lineHeight: 27 },
  amostras: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  amostra: { width: 108, gap: 6 },
  bolinha: { height: 48, borderRadius: 16, borderWidth: 1.5, borderColor: cores.borda },
  legenda: { fontFamily: fontes.texto, fontSize: 14, color: cores.textoSuave },
  legendaForte: { fontFamily: fontes.textoNegrito, fontSize: tamanhos.idoso.rotulo },
  linhaPasteis: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cartaoPastel: { width: 140, alignItems: 'center', gap: 8 },
  selo: { alignSelf: 'flex-start', backgroundColor: cores.alertaForte, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 8 },
  seloTexto: { fontFamily: fontes.textoNegrito, fontSize: 15, color: cores.superficie },
  botaoNaPaisagem: { marginTop: 'auto', alignSelf: 'flex-start' },
});

// Cartão do painel: a próxima consulta e o atalho para a lista (docs/PRD.md: "o familiar vê a consulta
// no painel"; visual da Variação E).
import { comQuem, proximaConsulta, quandoPorExtenso, type ConsultaLinha } from '@cuida/cliente';
import { BotaoSecundario, Cartao, cores, fontes, IconeCalendario, pasteis, Quadradinho, tamanhos } from '@cuida/visual';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

const T = tamanhos.familia;

export function CartaoProximaConsulta({ consultas, agora }: { consultas: ConsultaLinha[]; agora: Date }) {
  const proxima = proximaConsulta(consultas, agora);
  return (
    <Cartao style={{ gap: 10 }}>
      <View style={estilos.linha}>
        <Quadradinho pastel="lilas" tamanho={44}>
          <IconeCalendario cor={pasteis.lilas.icone} />
        </Quadradinho>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={estilos.rotulo}>Próxima consulta</Text>
          {proxima ? (
            <>
              <Text style={estilos.quando}>{quandoPorExtenso(proxima.quando, agora)}</Text>
              <Text style={estilos.texto}>{comQuem(proxima)}</Text>
            </>
          ) : (
            <Text style={estilos.texto}>Nenhuma consulta marcada.</Text>
          )}
        </View>
      </View>
      <BotaoSecundario tamanho="familia" rotulo={proxima ? 'Ver consultas' : 'Marcar consulta'} onPress={() => router.push('/consultas')} />
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rotulo: { fontFamily: fontes.textoNegrito, fontSize: T.minimo + 1, color: cores.textoSuave },
  quando: { fontFamily: fontes.titulo, fontSize: 18, color: cores.texto },
  texto: { fontFamily: fontes.texto, fontSize: T.texto, lineHeight: 23, color: cores.texto },
});

// Cartão para ligar os avisos (web push) no app do idoso: "Hora do remédio" e o check-in chegam
// mesmo com o app fechado. Some quando já estão ligados ou quando o navegador não tem suporte.
// Visual da Variação E (docs/design.md, @cuida/visual); texto de 20 px ou mais.
import { textoDasNotificacoes } from '@cuida/cliente';
import { BotaoPrincipal, Cartao, cores, fontes, pasteis } from '@cuida/visual';
import { StyleSheet, Text } from 'react-native';
import { useNotificacoes } from '@/lib/notificacoes';

export function AvisosNotificacao() {
  const { estado, ativar, ativando, erro } = useNotificacoes();
  if (!estado || estado === 'ativas' || estado === 'sem_suporte') return null;
  return (
    <Cartao pastel="pessego" style={estilos.cartao}>
      <Text style={estilos.titulo} accessibilityRole="header">
        Avisos do Cuida
      </Text>
      <Text style={estilos.texto}>{textoDasNotificacoes(estado, 'idoso')}</Text>
      {erro ? <Text style={estilos.erro}>Não deu certo. Tente de novo.</Text> : null}
      {estado === 'pedir' && (
        <BotaoPrincipal rotulo={ativando ? 'Ativando…' : 'Ativar avisos'} onPress={ativar} desabilitado={ativando} />
      )}
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  cartao: { gap: 12 },
  titulo: { fontFamily: fontes.titulo, fontSize: 24, color: pasteis.pessego.icone },
  texto: { fontFamily: fontes.texto, fontSize: 20, lineHeight: 28, color: cores.texto },
  erro: { fontFamily: fontes.textoNegrito, fontSize: 20, color: cores.alertaTexto },
});

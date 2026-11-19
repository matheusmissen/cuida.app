// Conversa com a Lia (visual da Variação E, docs/design.md).
// "Você disse" → cartão pêssego com a fala da Lia → aviso à família → botão "Responder" → "Voltar ao início".
import { familiaFoiAvisada } from '@cuida/cliente';
import { BotaoPrincipal, BotaoSecundario, Cartao, cores, espacos, fontes, IconeSino, pasteis } from '@cuida/visual';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconeMicrofone, IconeParar } from '@/components/icones';
import type { useConversa } from '@/lib/use-conversa';
import { NOME_ASSISTENTE, useFalando, useUltimaFala } from '@/lib/voz';

type Conversa = ReturnType<typeof useConversa>;

/** Barrinhas de "falando" (decorativas). */
function Ondas({ cor }: { cor: string }) {
  return (
    <View style={estilos.ondas} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[10, 22, 15, 20, 8].map((h, i) => (
        <View key={i} style={{ width: 5, height: h, borderRadius: 3, backgroundColor: cor }} />
      ))}
    </View>
  );
}

export function TelaConversa({ conversa, aoVoltar }: { conversa: Conversa; aoVoltar: () => void }) {
  const { estado, podeOuvir, ouvindoAgora, disse, alertas, comecar, terminar, enviar } = conversa;
  const ultimaFala = useUltimaFala();
  const falando = useFalando();
  const [escrito, setEscrito] = useState('');
  const ouvindo = estado === 'ouvindo';
  const pensando = estado === 'pensando';
  const fraseDoIdoso = ouvindo ? ouvindoAgora : disse;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}>
      <ScrollView contentContainerStyle={estilos.tela} keyboardShouldPersistTaps="handled">
        <Text style={estilos.tituloTela} accessibilityRole="header">
          Conversa com a {NOME_ASSISTENTE}
        </Text>

        {(ouvindo || disse) && (
          <View style={estilos.blocoDisse} accessibilityLiveRegion="polite">
            <Text style={estilos.textoSuave}>{ouvindo ? 'Estou ouvindo…' : 'Você disse'}</Text>
            {fraseDoIdoso ? (
              <Cartao style={estilos.balao}>
                <Text style={estilos.textoGrande}>{fraseDoIdoso}</Text>
              </Cartao>
            ) : null}
          </View>
        )}

        {ultimaFala && !ouvindo && (
          <Cartao pastel="pessego" style={estilos.lia}>
            <View accessibilityLiveRegion="polite" style={{ gap: 14 }}>
              <View style={estilos.cabecalhoLia}>
                <View style={estilos.avatarLia} accessibilityElementsHidden importantForAccessibility="no">
                  <Text style={estilos.letraLia}>L</Text>
                </View>
                <Text style={estilos.nomeLia}>{NOME_ASSISTENTE}</Text>
                {falando && (
                  <View style={estilos.falando}>
                    <Ondas cor={pasteis.pessego.icone} />
                    <Text style={[estilos.texto, { color: pasteis.pessego.icone }]}>falando</Text>
                  </View>
                )}
              </View>
              <Text style={estilos.fala}>{ultimaFala.texto}</Text>
            </View>
          </Cartao>
        )}

        {familiaFoiAvisada(alertas) && (
          <View style={estilos.avisada}>
            <View style={estilos.sino}>
              <IconeSino tamanho={22} cor={cores.sobrePrimaria} />
            </View>
            <Text style={[estilos.textoNegrito, { color: cores.alertaTexto, flexShrink: 1 }]}>Sua família foi avisada</Text>
          </View>
        )}

        <View style={{ flexGrow: 1, minHeight: 24 }} />

        {podeOuvir ? (
          <View style={estilos.blocoMic}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ouvindo ? 'Terminar de falar' : `Responder à ${NOME_ASSISTENTE}`}
              accessibilityState={{ busy: pensando, disabled: pensando }}
              onPress={ouvindo ? terminar : comecar}
              disabled={pensando}
              style={({ pressed }) => [
                estilos.mic,
                ouvindo && { backgroundColor: cores.alertaForte, borderColor: cores.alertaFundo },
                (pressed || pensando) && { opacity: 0.85 },
              ]}
            >
              {pensando ? (
                <ActivityIndicator color={cores.sobrePrimaria} size="large" />
              ) : ouvindo ? (
                <IconeParar tamanho={44} cor={cores.sobrePrimaria} traco={2.1} />
              ) : (
                <IconeMicrofone tamanho={48} cor={cores.sobrePrimaria} traco={2.1} />
              )}
            </Pressable>
            <Text style={estilos.rotuloMic}>
              {pensando ? `${NOME_ASSISTENTE} está pensando…` : ouvindo ? 'Terminei de falar' : 'Responder'}
            </Text>
          </View>
        ) : (
          // Navegador sem reconhecimento de fala (por exemplo, Firefox): escreve em letra grande.
          <View style={{ gap: 12 }}>
            <Text style={estilos.textoNegrito}>Escreva para a {NOME_ASSISTENTE}</Text>
            <TextInput
              value={escrito}
              onChangeText={setEscrito}
              placeholder="Ex.: Bom dia, Lia"
              placeholderTextColor={cores.textoSuave}
              accessibilityLabel={`Mensagem para a ${NOME_ASSISTENTE}`}
              style={estilos.campo}
              multiline
            />
            <BotaoPrincipal
              rotulo={pensando ? `${NOME_ASSISTENTE} está pensando…` : 'Enviar'}
              desabilitado={pensando || !escrito.trim()}
              onPress={() => {
                enviar(escrito);
                setEscrito('');
              }}
            />
          </View>
        )}

        <BotaoSecundario rotulo="Voltar ao início" onPress={aoVoltar} />
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: {
    flexGrow: 1,
    paddingHorizontal: espacos.lateral,
    paddingTop: 24,
    paddingBottom: 26,
    gap: espacos.bloco,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  tituloTela: { fontFamily: fontes.titulo, fontSize: 30, lineHeight: 36, color: cores.texto },
  blocoDisse: { alignItems: 'flex-end', gap: 8 },
  balao: { maxWidth: 360, borderBottomRightRadius: 10, paddingVertical: 14, paddingHorizontal: 20 },
  lia: { padding: 20 },
  cabecalhoLia: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarLia: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: cores.primaria,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letraLia: { fontFamily: fontes.titulo, fontSize: 24, color: cores.sobrePrimaria },
  nomeLia: { fontFamily: fontes.textoNegrito, fontSize: 22, color: cores.texto },
  falando: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 },
  ondas: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 26 },
  fala: { fontFamily: fontes.titulo, fontSize: 28, lineHeight: 35, color: cores.texto },
  texto: { fontFamily: fontes.texto, fontSize: 20, lineHeight: 27, color: cores.texto },
  textoSuave: { fontFamily: fontes.texto, fontSize: 20, lineHeight: 27, color: cores.textoSuave },
  textoNegrito: { fontFamily: fontes.textoNegrito, fontSize: 21, lineHeight: 28, color: cores.texto },
  textoGrande: { fontFamily: fontes.texto, fontSize: 23, lineHeight: 31, color: cores.texto },
  avisada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: cores.alertaFundo,
    borderColor: cores.alertaBorda,
    borderWidth: 1.5,
    borderRadius: 30,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 20,
  },
  sino: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: cores.alertaForte,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blocoMic: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  mic: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: cores.primaria,
    borderWidth: 10,
    borderColor: pasteis.menta.fundo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotuloMic: { fontFamily: fontes.titulo, fontSize: 26, color: cores.texto, textAlign: 'center' },
  campo: {
    fontFamily: fontes.texto,
    fontSize: 22,
    padding: 18,
    minHeight: 100,
    color: cores.texto,
    backgroundColor: cores.superficie,
    borderColor: cores.bordaCampo,
    borderWidth: 1.5,
    borderRadius: 26,
    outlineStyle: 'none',
  } as unknown as TextStyle,
});

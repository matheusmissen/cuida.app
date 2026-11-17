// Conversa com a Lia (referência: docs/design/telas/Idoso-Conversa.dc.html).
// "Você disse" → cartão lilás com a fala da Lia → aviso à família → botão "Responder" → "Voltar ao início".
import { familiaFoiAvisada } from '@cuida/cliente';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconeMicrofone, IconeParar, IconeSino } from '@/components/icones';
import { BotaoPrincipal, BotaoSecundario, cartao, Destaque, Ondas, Texto } from '@/components/ui';
import { cores, espacos, fontes, raios, sombras, tamanhos } from '@/lib/tema';
import type { useConversa } from '@/lib/use-conversa';
import { NOME_ASSISTENTE, useFalando, useUltimaFala } from '@/lib/voz';

type Conversa = ReturnType<typeof useConversa>;

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
        {(ouvindo || disse) && (
          <View style={estilos.blocoDisse} accessibilityLiveRegion="polite">
            <Texto tamanho={20} cor={cores.textoSuave} style={{ paddingRight: 8 }}>
              {ouvindo ? 'Estou ouvindo…' : 'Você disse'}
            </Texto>
            {fraseDoIdoso ? (
              <View style={[cartao, estilos.balao]}>
                <Texto tamanho={tamanhos.destaque}>{fraseDoIdoso}</Texto>
              </View>
            ) : null}
          </View>
        )}

        {ultimaFala && !ouvindo && (
          <View style={estilos.lia} accessibilityLiveRegion="polite">
            <View style={estilos.cabecalhoLia}>
              <View style={estilos.avatarLia} accessibilityElementsHidden importantForAccessibility="no">
                <Destaque tamanho={24} cor={cores.sobreTinta}>
                  L
                </Destaque>
              </View>
              <Texto peso="negrito">{NOME_ASSISTENTE}</Texto>
              {falando && (
                <View style={estilos.falando}>
                  <Ondas cor={cores.lilas.forte} alturas={[10, 22, 15, 20, 8]} />
                  <Texto tamanho={20} cor={cores.lilas.texto}>
                    falando
                  </Texto>
                </View>
              )}
            </View>
            <Destaque tamanho={tamanhos.fala} style={{ lineHeight: Math.round(tamanhos.fala * 1.22) }}>
              {ultimaFala.texto}
            </Destaque>
          </View>
        )}

        {familiaFoiAvisada(alertas) && (
          <View style={estilos.avisada}>
            <View style={estilos.sino}>
              <IconeSino tamanho={22} cor={cores.sobreTinta} traco={2.2} />
            </View>
            <Texto tamanho={20} cor={cores.alerta.texto} style={{ flexShrink: 1 }}>
              Sua família foi avisada
            </Texto>
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
                ouvindo && { backgroundColor: cores.lilas.forte },
                (pressed || pensando) && { opacity: 0.85 },
              ]}
            >
              {pensando ? (
                <ActivityIndicator color={cores.sobreTinta} size="large" />
              ) : ouvindo ? (
                <IconeParar tamanho={44} cor={cores.sobreTinta} />
              ) : (
                <IconeMicrofone tamanho={46} cor={cores.sobreTinta} traco={1.8} />
              )}
            </Pressable>
            <Destaque tamanho={26} style={{ marginTop: 12 }}>
              {pensando ? `${NOME_ASSISTENTE} está pensando…` : ouvindo ? 'Terminei de falar' : 'Responder'}
            </Destaque>
          </View>
        ) : (
          // Navegador sem reconhecimento de fala (por exemplo, Firefox): escreve em letra grande.
          <View style={{ gap: 12 }}>
            <Texto tamanho={20} cor={cores.textoSuave}>
              Escreva para a {NOME_ASSISTENTE}
            </Texto>
            <TextInput
              value={escrito}
              onChangeText={setEscrito}
              placeholder="Ex.: Bom dia, Lia"
              placeholderTextColor={cores.textoSuave}
              accessibilityLabel={`Mensagem para a ${NOME_ASSISTENTE}`}
              style={[cartao, estilos.campo]}
              multiline
            />
            <BotaoPrincipal
              titulo={pensando ? `${NOME_ASSISTENTE} está pensando…` : 'Enviar'}
              desativado={pensando || !escrito.trim()}
              onPress={() => {
                enviar(escrito);
                setEscrito('');
              }}
            />
          </View>
        )}

        <BotaoSecundario titulo="Voltar ao início" onPress={aoVoltar} />
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: {
    flexGrow: 1,
    paddingHorizontal: espacos.margemTela,
    paddingTop: 28,
    paddingBottom: 26,
    gap: 16,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  blocoDisse: { alignItems: 'flex-end', gap: 8 },
  balao: {
    maxWidth: 340,
    borderRadius: raios.cartaoMedio,
    borderBottomRightRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 22,
  },
  lia: { backgroundColor: cores.lilas.fundo, borderRadius: 34, padding: 22, gap: 14 },
  cabecalhoLia: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarLia: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: cores.tinta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  falando: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 10 },
  avisada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: cores.alerta.fundo,
    borderRadius: raios.pilula,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 20,
  },
  sino: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: cores.alerta.forte,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blocoMic: { alignItems: 'center', gap: 12, paddingVertical: 12 },
  mic: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: cores.tinta,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 0 0 12px ${cores.lilas.fundo}, ${sombras.botaoPrincipal}`,
  },
  campo: {
    fontFamily: fontes.texto,
    fontSize: tamanhos.destaque,
    padding: 18,
    minHeight: 96,
    color: cores.tinta,
  },
});

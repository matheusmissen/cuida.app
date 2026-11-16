// Botão grande "Falar com a Lia". Um toque começa a ouvir; outro toque termina
// (ou a escuta termina sozinha quando a pessoa para de falar).
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useConversa } from '@/lib/use-conversa';
import { tema } from '@/lib/tema';
import { NOME_ASSISTENTE, useUltimaFala } from '@/lib/voz';

export function FalarComLia() {
  const { estado, podeOuvir, ouvindoAgora, disse, comecar, terminar, enviar } = useConversa();
  const [escrito, setEscrito] = useState('');
  // Toda resposta da Lia (conversa, alarme, avisos) aparece aqui em letra grande e também é falada.
  const ultimaFala = useUltimaFala();

  const ouvindo = estado === 'ouvindo';
  const pensando = estado === 'pensando';

  return (
    <View style={estilos.caixa}>
      {(ouvindo || disse) && (
        <View style={estilos.disse} accessibilityLiveRegion="polite">
          <Text style={estilos.rotulo}>{ouvindo ? 'Estou ouvindo…' : 'Você disse'}</Text>
          {(ouvindo ? ouvindoAgora : disse) ? (
            <Text style={estilos.textoDisse}>{ouvindo ? ouvindoAgora : disse}</Text>
          ) : null}
        </View>
      )}

      {ultimaFala && !ouvindo && (
        <View style={estilos.fala} accessibilityLiveRegion="polite">
          <Text style={estilos.nomeLia}>{NOME_ASSISTENTE}</Text>
          <Text style={estilos.textoFala}>{ultimaFala}</Text>
        </View>
      )}

      {podeOuvir ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ouvindo ? 'Terminar de falar' : `Falar com a ${NOME_ASSISTENTE}`}
          accessibilityState={{ busy: pensando }}
          onPress={ouvindo ? terminar : comecar}
          disabled={pensando}
          style={({ pressed }) => [
            estilos.botao,
            ouvindo && estilos.botaoOuvindo,
            (pressed || pensando) && { opacity: 0.8 },
          ]}
        >
          {pensando ? (
            <>
              <ActivityIndicator color="#fff" size="large" />
              <Text style={estilos.textoBotao}>{NOME_ASSISTENTE} está pensando…</Text>
            </>
          ) : (
            <Text style={estilos.textoBotao}>
              {ouvindo ? '⏹  Terminei de falar' : `🎤  Falar com a ${NOME_ASSISTENTE}`}
            </Text>
          )}
        </Pressable>
      ) : (
        // Navegador sem reconhecimento de fala (por exemplo, Firefox): escreve em letra grande.
        <View style={{ gap: 12 }}>
          <Text style={estilos.rotulo}>Escreva para a {NOME_ASSISTENTE}</Text>
          <TextInput
            value={escrito}
            onChangeText={setEscrito}
            placeholder="Ex.: Bom dia, Lia"
            placeholderTextColor="#666"
            accessibilityLabel={`Mensagem para a ${NOME_ASSISTENTE}`}
            style={estilos.campo}
            multiline
          />
          <Pressable
            accessibilityRole="button"
            disabled={pensando || !escrito.trim()}
            onPress={() => {
              enviar(escrito);
              setEscrito('');
            }}
            style={({ pressed }) => [estilos.botao, (pressed || pensando || !escrito.trim()) && { opacity: 0.6 }]}
          >
            <Text style={estilos.textoBotao}>{pensando ? `${NOME_ASSISTENTE} está pensando…` : 'Enviar'}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: { gap: 16 },
  disse: { borderWidth: 3, borderColor: tema.suave, borderRadius: 20, padding: 20, gap: 4 },
  fala: { backgroundColor: '#E8EEFF', borderRadius: 20, padding: 20, gap: 4 },
  nomeLia: { fontSize: tema.letra.minima, fontWeight: '800', color: tema.primaria },
  textoFala: { fontSize: tema.letra.media, color: tema.texto, lineHeight: 38 },
  rotulo: { fontSize: tema.letra.minima, fontWeight: '700', color: tema.suave },
  textoDisse: { fontSize: tema.letra.media, color: tema.texto, lineHeight: 38 },
  botao: {
    minHeight: 140,
    borderRadius: 28,
    backgroundColor: tema.primaria,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 8,
    borderWidth: 4,
    borderColor: '#002A78',
  },
  botaoOuvindo: { backgroundColor: tema.perigo, borderColor: '#5C000F' },
  textoBotao: { fontSize: tema.letra.grande, fontWeight: '900', color: '#fff', textAlign: 'center' },
  campo: {
    fontSize: tema.letra.media,
    borderWidth: 3,
    borderColor: tema.texto,
    borderRadius: 16,
    padding: 16,
    minHeight: 96,
    color: tema.texto,
  },
});

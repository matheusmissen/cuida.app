// Alarme de remédio em tela cheia. Um remédio por vez, um botão: "Tomei".
// No celular aparece junto com o alarme do sistema; na web é um modal na própria página.
import { deveRealarmar, horaCurta, type DoseComRemedio } from '@cuida/cliente';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tema } from '@/lib/tema';
import { falar } from '@/lib/voz';

export function fraseDoAlarme(dose: DoseComRemedio, apelido: string, deNovo: boolean): string {
  const r = dose.horarios.remedios;
  return deNovo
    ? `${apelido}, ainda falta tomar ${r.nome}, ${r.dose}. Quando tomar, aperte o botão verde.`
    : `${apelido}, está na hora do remédio: ${r.nome}, ${r.dose}. Quando tomar, aperte o botão verde.`;
}

export function Alarme({
  dose,
  apelido,
  agora,
  onTomei,
}: {
  dose: DoseComRemedio;
  apelido: string;
  agora: Date;
  onTomei: (doseId: string) => Promise<boolean>;
}) {
  const [enviando, setEnviando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const falado = useRef<{ id: string; deNovo: boolean } | null>(null);
  const deNovo = deveRealarmar(dose, agora);
  const frase = fraseDoAlarme(dose, apelido, deNovo);
  const r = dose.horarios.remedios;

  // Fala ao aparecer e de novo aos 30 min (regra de dose sem confirmação).
  useEffect(() => {
    const anterior = falado.current;
    if (!anterior || anterior.id !== dose.id || (deNovo && !anterior.deNovo)) {
      falado.current = { id: dose.id, deNovo };
      falar(frase);
    }
  }, [dose.id, deNovo, frase]);

  async function tomei() {
    setEnviando(true);
    setFalhou(false);
    const ok = await onTomei(dose.id);
    setEnviando(false);
    if (ok) falar(`Muito bem, ${apelido}! Anotei aqui.`);
    else {
      setFalhou(true);
      falar('Não consegui anotar. Aperte o botão verde de novo, por favor.');
    }
  }

  return (
    <Modal visible animationType="fade" transparent={false} onRequestClose={() => {}} statusBarTranslucent>
      <SafeAreaView style={estilos.tela}>
        <View style={estilos.topo}>
          <Text style={estilos.hora}>{horaCurta(dose.previsto_em)}</Text>
          <Text style={estilos.chamada} accessibilityRole="header">
            {deNovo ? 'Ainda falta tomar' : 'Hora do remédio'}
          </Text>
        </View>
        <View style={estilos.centro}>
          {r.foto_url && <Image source={{ uri: r.foto_url }} style={estilos.foto} contentFit="contain" />}
          <Text style={estilos.remedio}>{r.nome}</Text>
          <Text style={estilos.dose}>{r.dose}</Text>
        </View>
        {falhou && <Text style={estilos.erro}>Não consegui anotar. Aperte de novo.</Text>}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tomei o remédio"
          onPress={tomei}
          disabled={enviando}
          style={({ pressed }) => [estilos.botao, (pressed || enviando) && { opacity: 0.75 }]}
        >
          <Text style={estilos.textoBotao}>{enviando ? 'Anotando…' : 'Tomei'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Ouvir de novo" onPress={() => falar(frase)} style={estilos.ouvir}>
          <Text style={estilos.textoOuvir}>🔊 Ouvir de novo</Text>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: tema.alarme, padding: 24, gap: 16 },
  topo: { alignItems: 'center', gap: 4, paddingTop: 16 },
  hora: { fontSize: tema.letra.grande, fontWeight: '800', color: tema.texto },
  chamada: { fontSize: tema.letra.media, fontWeight: '700', color: tema.texto },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  foto: { width: 200, height: 200, borderRadius: 16, backgroundColor: '#fff' },
  remedio: { fontSize: tema.letra.enorme, fontWeight: '800', color: tema.texto, textAlign: 'center' },
  dose: { fontSize: tema.letra.grande, color: tema.texto, textAlign: 'center' },
  erro: { fontSize: tema.letra.minima, color: tema.perigo, fontWeight: '700', textAlign: 'center' },
  botao: {
    minHeight: 120,
    borderRadius: 24,
    backgroundColor: tema.tomei,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#063D21',
  },
  textoBotao: { fontSize: 56, fontWeight: '900', color: '#fff' },
  ouvir: { minHeight: tema.botaoMin, alignItems: 'center', justifyContent: 'center' },
  textoOuvir: { fontSize: tema.letra.minima, color: tema.primaria, fontWeight: '700' },
});

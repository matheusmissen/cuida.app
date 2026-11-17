// Alarme de remédio (referência: docs/design/telas/Idoso-Alarme.dc.html).
// Um remédio por vez, uma ação: "Tomei". No celular ocupa a tela inteira; na web é um modal
// centralizado sobre a página (os jurados não instalam nada).
import { deveRealarmar, horaCurta, type DoseComRemedio } from '@cuida/cliente';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconeAltoFalante, IconeCheck, IconeGota, IconeSino } from '@/components/icones';
import { BotaoSecundario, Destaque, Ondas, Texto } from '@/components/ui';
import { alvos, cores, fontes, raios, sombras, tamanhos } from '@/lib/tema';
import { falar, useFalando } from '@/lib/voz';

const WEB = Platform.OS === 'web';

export function fraseDoAlarme(dose: DoseComRemedio, apelido: string, deNovo: boolean): string {
  const r = dose.horarios.remedios;
  return deNovo
    ? `${apelido}, ainda falta tomar ${r.nome}, ${r.dose}. Quando tomar, aperte o botão Tomei.`
    : `${apelido}, está na hora do remédio: ${r.nome}, ${r.dose}. Quando tomar, aperte o botão Tomei.`;
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
  const falando = useFalando();
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
      falar('Não consegui anotar. Aperte o botão Tomei de novo, por favor.');
    }
  }

  const conteudo = (
    <ScrollView contentContainerStyle={estilos.conteudo} bounces={false}>
      <View style={estilos.chamada}>
        <View style={estilos.sino}>
          <IconeSino tamanho={22} cor={cores.sobreTinta} traco={2.2} />
        </View>
        <Texto tamanho={24} peso="negrito" accessibilityRole="header">
          {deNovo ? 'Ainda falta tomar' : 'Hora do remédio'}
        </Texto>
      </View>

      <Destaque tamanho={tamanhos.horarioAlarme} style={estilos.hora}>
        {horaCurta(dose.previsto_em)}
      </Destaque>

      <View style={estilos.remedio}>
        {r.foto_url ? (
          <Image source={{ uri: r.foto_url }} style={estilos.foto} contentFit="cover" accessibilityIgnoresInvertColors />
        ) : (
          <View style={estilos.icone}>
            <IconeGota tamanho={38} cor={cores.lilas.forte} />
          </View>
        )}
        <View style={{ flex: 1, gap: 4 }}>
          <Destaque tamanho={36} style={{ lineHeight: 40 }}>
            {r.nome}
          </Destaque>
          <Texto tamanho={26} cor={cores.textoSuave}>
            {r.dose}
          </Texto>
        </View>
      </View>

      <View style={[estilos.lendo, !falando && { opacity: 0 }]} accessibilityElementsHidden={!falando}>
        <Ondas cor={cores.salvia.forte} />
        <Texto tamanho={20} cor={cores.salvia.texto}>
          A Lia está lendo em voz alta
        </Texto>
      </View>

      <View style={{ flexGrow: 1, minHeight: 12 }} />

      {falhou && (
        <Texto tamanho={22} peso="negrito" cor={cores.alerta.texto} style={{ textAlign: 'center' }}>
          Não consegui anotar. Aperte de novo.
        </Texto>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tomei o remédio"
        accessibilityState={{ busy: enviando, disabled: enviando }}
        onPress={tomei}
        disabled={enviando}
        style={({ pressed }) => [estilos.tomei, (pressed || enviando) && { opacity: 0.85 }]}
      >
        <View style={estilos.checkTomei}>
          <IconeCheck tamanho={38} cor={cores.tinta} traco={2.8} />
        </View>
        <Text style={estilos.textoTomei}>{enviando ? 'Anotando…' : 'Tomei'}</Text>
      </Pressable>
      <BotaoSecundario
        titulo="Ouvir de novo"
        icone={<IconeAltoFalante tamanho={26} cor={cores.tinta} />}
        onPress={() => falar(frase)}
      />
    </ScrollView>
  );

  if (WEB) {
    return (
      <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
        <View style={estilos.fundoWeb}>
          <View style={estilos.janelaWeb} accessibilityViewIsModal aria-modal role="dialog" aria-label="Hora do remédio">
            {conteudo}
          </View>
        </View>
      </Modal>
    );
  }
  return (
    <Modal visible animationType="fade" onRequestClose={() => {}} statusBarTranslucent>
      <SafeAreaView style={{ flex: 1, backgroundColor: cores.salvia.fundo }}>{conteudo}</SafeAreaView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  conteudo: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: WEB ? 32 : 40,
    paddingBottom: 24,
    gap: 20,
  },
  chamada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: cores.salvia.fundoClaro,
    borderRadius: raios.pilula,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 22,
  },
  sino: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: cores.tinta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hora: { lineHeight: tamanhos.horarioAlarme, letterSpacing: -0.03 * tamanhos.horarioAlarme, marginTop: 8 },
  remedio: {
    width: '100%',
    backgroundColor: cores.cartao,
    borderRadius: raios.cartaoGrande,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    boxShadow: '0 1px 2px rgba(24,24,28,0.04), 0 16px 32px rgba(31,94,58,0.10)',
  },
  icone: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: cores.lilas.fundo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foto: { width: 76, height: 76, borderRadius: 38 },
  lendo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tomei: {
    width: '100%',
    height: alvos.tomei,
    borderRadius: alvos.tomei / 2,
    backgroundColor: cores.tinta,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    boxShadow: sombras.tomei,
  },
  checkTomei: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: cores.salvia.fundo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoTomei: { fontFamily: fontes.destaque, fontSize: tamanhos.botaoTomei, color: cores.sobreTinta },
  fundoWeb: {
    flex: 1,
    backgroundColor: 'rgba(24,24,28,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  janelaWeb: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '100%',
    backgroundColor: cores.salvia.fundo,
    borderRadius: raios.cartaoGrande,
    overflow: 'hidden',
    boxShadow: '0 24px 64px rgba(24,24,28,0.30)',
  },
});

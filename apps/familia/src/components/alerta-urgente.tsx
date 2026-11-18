// Alerta vermelho na família: cartão vermelho no topo do painel (a tela do alerta fica em tela-alerta.tsx).
// Som (web) ou vibração (celular) na chegada e título da aba piscando até marcar como visto.
import { dividirMotivo, horaCurta, type AlertaLinha } from '@cuida/cliente';
import { useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { IconeSetaDireita } from '@/components/icones';
import { fontes, paleta, sombras } from '@/lib/tema';

function bipe() {
  try {
    const Ctx = (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach((inicio) => {
      const osc = ctx.createOscillator();
      const ganho = ctx.createGain();
      osc.frequency.value = 880;
      ganho.gain.value = 0.15;
      osc.connect(ganho).connect(ctx.destination);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + 0.2);
    });
  } catch {
    // navegador sem áudio liberado: o cartão vermelho continua na tela
  }
}

/** Som/vibração para alertas que chegam com a tela aberta e título da aba piscando. */
export function useAvisoUrgente(alertas: AlertaLinha[], nomePaciente: string) {
  const conhecidos = useRef<Set<string> | null>(null);

  useEffect(() => {
    const ids = new Set(alertas.map((a) => a.id));
    if (conhecidos.current) {
      const novo = alertas.some((a) => !conhecidos.current!.has(a.id));
      if (novo) {
        if (Platform.OS === 'web') bipe();
        else Vibration.vibrate([0, 600, 300, 600, 300, 600]);
      }
    }
    conhecidos.current = ids;
  }, [alertas]);

  useEffect(() => {
    if (Platform.OS !== 'web' || alertas.length === 0) return;
    const original = document.title;
    let alterna = false;
    const timer = setInterval(() => {
      alterna = !alterna;
      document.title = alterna ? `🔴 URGENTE — ${nomePaciente}` : original;
    }, 1000);
    return () => {
      clearInterval(timer);
      document.title = original;
    };
  }, [alertas.length, nomePaciente]);
}

/** Cartão vermelho do topo do painel. */
export function CartaoUrgente({ alerta, onAbrir }: { alerta: AlertaLinha; onAbrir: () => void }) {
  const { titulo } = dividirMotivo(alerta.motivo);
  return (
    <View style={estilos.cartaoUrgente} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <View style={estilos.linhaUrgente}>
        <View style={estilos.pontoBranco} />
        <Text style={estilos.rotuloUrgente}>URGENTE · {horaCurta(alerta.criado_em)}</Text>
      </View>
      <Text style={estilos.tituloUrgente}>{titulo}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ver alerta"
        onPress={onAbrir}
        style={({ pressed }) => [estilos.verAlerta, pressed && { opacity: 0.85 }]}
      >
        <Text style={estilos.textoVerAlerta}>Ver alerta</Text>
        <IconeSetaDireita tamanho={18} cor={paleta.alerta.texto} traco={2.4} />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartaoUrgente: {
    backgroundColor: paleta.alerta.forte,
    borderRadius: 30,
    paddingVertical: 18,
    paddingLeft: 20,
    paddingRight: 18,
    gap: 6,
    boxShadow: sombras.alerta,
  },
  linhaUrgente: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pontoBranco: { width: 8, height: 8, borderRadius: 4, backgroundColor: paleta.sobreTinta },
  rotuloUrgente: { fontFamily: fontes.textoNegrito, fontSize: 14, letterSpacing: 0.84, color: paleta.sobreTinta },
  tituloUrgente: { fontFamily: fontes.destaque, fontSize: 22, lineHeight: 26, color: paleta.sobreTinta },
  verAlerta: {
    alignSelf: 'flex-start',
    marginTop: 6,
    height: 44,
    backgroundColor: paleta.cartao,
    borderRadius: 22,
    paddingLeft: 18,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  textoVerAlerta: { fontFamily: fontes.textoNegrito, fontSize: 16, color: paleta.alerta.texto },
});

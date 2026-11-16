// Destaque do alerta vermelho: faixa grande no topo do painel, com som/vibração na chegada
// e título da aba piscando na web, até alguém marcar "Vi, estou cuidando".
import { horaCurta, type AlertaLinha } from '@cuida/cliente';
import { useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';

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
    // navegador sem áudio liberado: a faixa vermelha continua na tela
  }
}

export function AlertasUrgentes({
  alertas,
  nomePaciente,
  onVisto,
}: {
  alertas: AlertaLinha[];
  nomePaciente: string;
  onVisto: (id: string) => void;
}) {
  const conhecidos = useRef<Set<string> | null>(null);

  // Som e vibração só para alertas que chegaram com a tela aberta (não a cada recarga).
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

  // Na web, o título da aba pisca enquanto houver alerta vermelho não visto.
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

  if (alertas.length === 0) return null;
  return (
    <View style={{ gap: 12 }} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      {alertas.map((a) => (
        <View key={a.id} style={estilos.faixa}>
          <Text style={estilos.rotulo}>🔴 URGENTE · {nomePaciente}</Text>
          <Text style={estilos.motivo}>{a.motivo}</Text>
          <Text style={estilos.hora}>Às {horaCurta(a.criado_em)}. Todo o círculo de cuidado foi avisado.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => onVisto(a.id)}
            style={({ pressed }) => [estilos.botao, pressed && { opacity: 0.8 }]}
          >
            <Text style={estilos.textoBotao}>Vi, estou cuidando</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  faixa: {
    backgroundColor: '#B00020',
    borderRadius: 16,
    padding: 18,
    gap: 8,
    borderWidth: 3,
    borderColor: '#7A0016',
  },
  rotulo: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  motivo: { color: '#fff', fontSize: 22, fontWeight: '800', lineHeight: 28 },
  hora: { color: '#FFE3E8', fontSize: 15 },
  botao: {
    marginTop: 6,
    backgroundColor: '#fff',
    borderRadius: 10,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotao: { color: '#B00020', fontSize: 17, fontWeight: '800' },
});

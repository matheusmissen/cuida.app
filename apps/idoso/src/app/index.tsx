import { dosesDevidas, horaCurta, proximaDose, saudacao } from '@cuida/cliente';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alarme } from '@/components/alarme';
import { VincularAparelho } from '@/components/vincular-aparelho';
import { useAparelho } from '@/lib/aparelho';
import { tema } from '@/lib/tema';
import { useDoses } from '@/lib/use-doses';
import { falar, NOME_ASSISTENTE, useUltimaFala } from '@/lib/voz';

export default function Inicio() {
  const { carregando, paciente, erro } = useAparelho();

  if (carregando) {
    return (
      <SafeAreaView style={estilos.centro}>
        <ActivityIndicator size="large" color={tema.primaria} />
      </SafeAreaView>
    );
  }
  if (erro) {
    return (
      <SafeAreaView style={estilos.centro}>
        <Text style={estilos.texto}>{erro}</Text>
      </SafeAreaView>
    );
  }
  if (!paciente) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <VincularAparelho />
      </SafeAreaView>
    );
  }
  return <TelaDoDia pacienteId={paciente.id} apelido={paciente.apelido || paciente.nome.split(' ')[0]} />;
}

function TelaDoDia({ pacienteId, apelido }: { pacienteId: string; apelido: string }) {
  const { doses, agora, confirmar } = useDoses(pacienteId);
  const ultimaFala = useUltimaFala();
  // Na web o navegador só deixa falar depois de um toque: um botão "Começar" na abertura.
  const [iniciado, setIniciado] = useState(Platform.OS !== 'web');

  const devidas = dosesDevidas(doses, agora);
  const proxima = proximaDose(doses, agora);
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(agora);
  const tomadasHoje = doses.filter(
    (d) => d.confirmado_em && new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(d.previsto_em)) === hoje,
  );

  if (!iniciado) {
    return (
      <SafeAreaView style={estilos.centro}>
        <Text style={estilos.saudacao}>
          {saudacao(agora)}, {apelido}!
        </Text>
        <Pressable
          accessibilityRole="button"
          style={estilos.comecar}
          onPress={() => {
            setIniciado(true);
            falar(`${saudacao(agora)}, ${apelido}! Eu sou a ${NOME_ASSISTENTE}. Vou te lembrar dos remédios.`);
          }}
        >
          <Text style={estilos.textoComecar}>Começar</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tema.fundo }}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <Text style={estilos.saudacao}>
          {saudacao(agora)}, {apelido}!
        </Text>

        {ultimaFala && (
          <View style={estilos.fala} accessibilityLiveRegion="polite">
            <Text style={estilos.nomeLia}>{NOME_ASSISTENTE}</Text>
            <Text style={estilos.textoFala}>{ultimaFala}</Text>
          </View>
        )}

        <View style={estilos.cartao}>
          {proxima ? (
            <>
              <Text style={estilos.rotulo}>Próximo remédio</Text>
              <Text style={estilos.grande}>
                {horaCurta(proxima.previsto_em)} · {proxima.horarios.remedios.nome}
              </Text>
              <Text style={estilos.texto}>{proxima.horarios.remedios.dose}</Text>
            </>
          ) : (
            <Text style={estilos.grande}>Nenhum remédio marcado para depois.</Text>
          )}
        </View>

        {tomadasHoje.length > 0 && (
          <View style={estilos.cartao}>
            <Text style={estilos.rotulo}>Hoje você já tomou</Text>
            {tomadasHoje.map((d) => (
              <Text key={d.id} style={estilos.texto}>
                ✓ {horaCurta(d.previsto_em)} · {d.horarios.remedios.nome}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>

      {devidas[0] && <Alarme dose={devidas[0]} apelido={apelido} agora={agora} onTomei={confirmar} />}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 32, backgroundColor: tema.fundo },
  conteudo: { padding: 24, gap: 20, maxWidth: 640, width: '100%', alignSelf: 'center' },
  saudacao: { fontSize: tema.letra.grande, fontWeight: '800', color: tema.texto, textAlign: 'center' },
  cartao: { borderWidth: 3, borderColor: tema.texto, borderRadius: 20, padding: 20, gap: 8 },
  rotulo: { fontSize: tema.letra.minima, fontWeight: '700', color: tema.suave },
  grande: { fontSize: tema.letra.media, fontWeight: '800', color: tema.texto },
  texto: { fontSize: tema.letra.minima, color: tema.texto, lineHeight: 32 },
  fala: { backgroundColor: '#E8EEFF', borderRadius: 20, padding: 20, gap: 4 },
  nomeLia: { fontSize: tema.letra.minima, fontWeight: '800', color: tema.primaria },
  textoFala: { fontSize: tema.letra.media, color: tema.texto, lineHeight: 38 },
  comecar: {
    minHeight: 120,
    minWidth: 280,
    borderRadius: 24,
    backgroundColor: tema.primaria,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  textoComecar: { fontSize: tema.letra.enorme, fontWeight: '900', color: '#fff' },
});

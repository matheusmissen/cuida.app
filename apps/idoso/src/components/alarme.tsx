// Tela 7 do idoso: Hora do remédio (docs/PRD.md, seção 10; visual da Variação E, docs/design.md).
// Foto da caixa (ou o desenho do comprimido na cor e no formato cadastrados), dose, botão grande "Tomei"
// e "Lembrar em 10 minutos". No celular ocupa a tela inteira; na web é um modal sobre a página.
import { comoFalarOComprimido, corDoComprimido, deveRealarmar, descricaoDoComprimido, horaCurta, type DoseComRemedio } from '@cuida/cliente';
import type { Tempos } from '@cuida/regras';
import {
  BotaoPrincipal,
  BotaoSecundario,
  Cartao,
  cores,
  DesenhoComprimido,
  fontes,
  IconeConfirmado,
  Paisagem,
  paisagem,
  usePeriodo,
} from '@cuida/visual';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { IconeAltoFalante } from '@/components/icones';
import { useFotoRemedio } from '@/lib/foto-remedio';
import { falar } from '@/lib/voz';

const WEB = Platform.OS === 'web';

export function fraseDoAlarme(dose: DoseComRemedio, apelido: string, deNovo: boolean): string {
  const r = dose.horarios.remedios;
  const como = comoFalarOComprimido(r.cor, r.formato);
  const reconhecer = como ? ` É ${como}.` : '';
  return deNovo
    ? `${apelido}, ainda falta tomar ${r.nome}, ${r.dose}.${reconhecer} Quando tomar, aperte o botão Tomei.`
    : `${apelido}, está na hora do remédio: ${r.nome}, ${r.dose}.${reconhecer} Quando tomar, aperte o botão Tomei.`;
}

export function Alarme({
  dose,
  apelido,
  agora,
  tempos,
  onTomei,
  onAdiar,
}: {
  dose: DoseComRemedio;
  apelido: string;
  agora: Date;
  /** Tempos do paciente: o alarme fala de novo quando passa a tolerância. */
  tempos?: Tempos;
  onTomei: (doseId: string) => Promise<boolean>;
  /** "Lembrar em 10 minutos". */
  onAdiar: (dose: DoseComRemedio) => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const falado = useRef<{ id: string; deNovo: boolean } | null>(null);
  const periodo = usePeriodo();
  const deNovo = deveRealarmar(dose, agora, tempos);
  const frase = fraseDoAlarme(dose, apelido, deNovo);
  const r = dose.horarios.remedios;
  const foto = useFotoRemedio(r.foto_url);
  const como = descricaoDoComprimido(r.cor, r.formato);
  const cor = corDoComprimido(r.cor);

  // Fala ao aparecer e de novo quando passa a tolerância sem confirmação.
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

  function depois() {
    onAdiar(dose);
    falar('Tudo bem. Daqui a 10 minutos eu lembro de novo.');
  }

  const conteudo = (
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }} bounces={false}>
      <Paisagem altura={128}>
        <Text style={[estilos.chamada, { color: paisagem[periodo].texto }]} accessibilityRole="header">
          {deNovo ? 'Ainda falta tomar' : 'Hora do remédio'}
        </Text>
        <Text style={[estilos.hora, { color: paisagem[periodo].texto }]}>{horaCurta(dose.previsto_em)}</Text>
      </Paisagem>

      <View style={estilos.miolo}>
        <Cartao style={estilos.remedio}>
          {foto ? (
            <Image
              source={{ uri: foto }}
              style={estilos.foto}
              contentFit="contain"
              accessibilityLabel={`Foto da caixa de ${r.nome}`}
            />
          ) : (
            <View style={estilos.desenho}>
              <DesenhoComprimido formato={r.formato} cor={cor?.hex} duasCores={r.cor === 'colorido'} tamanho={96} />
            </View>
          )}
          <Text style={estilos.nome} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
            {r.nome}
          </Text>
          <Text style={estilos.dose}>{r.dose}</Text>
          {como ? (
            <View style={estilos.como}>
              <Text style={estilos.textoComo}>
                {como}
              </Text>
            </View>
          ) : null}
        </Cartao>

        {falhou ? <Text style={estilos.erro}>Não consegui anotar. Aperte de novo.</Text> : null}

        <BotaoPrincipal
          tamanho="tomei"
          rotulo={enviando ? 'Anotando…' : 'Tomei'}
          icone={<IconeConfirmado tamanho={34} cor={cores.sobrePrimaria} />}
          onPress={tomei}
          desabilitado={enviando}
        />
        <BotaoSecundario rotulo="Lembrar em 10 minutos" onPress={depois} desabilitado={enviando} />
        <Pressable
          accessibilityRole="button"
          onPress={() => falar(frase)}
          style={({ pressed }) => [estilos.ouvir, pressed && { opacity: 0.7 }]}
        >
          <IconeAltoFalante tamanho={26} cor={cores.primaria} />
          <Text style={estilos.textoOuvir}>Ouvir de novo</Text>
        </Pressable>
      </View>
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
      <View style={{ flex: 1, backgroundColor: cores.fundo }}>{conteudo}</View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  chamada: { fontFamily: fontes.textoNegrito, fontSize: 22 },
  hora: { fontFamily: fontes.titulo, fontSize: 52, lineHeight: 58, letterSpacing: -1.2 },
  miolo: { paddingHorizontal: 20, paddingTop: 16, gap: 14, width: '100%', maxWidth: 560, alignSelf: 'center' },
  remedio: { alignItems: 'center', gap: 6, paddingVertical: 18 },
  // A foto aparece inteira (sem cortar a caixa), numa altura que deixa "Tomei" à vista.
  foto: { width: '100%', height: 160, borderRadius: 16 },
  desenho: {
    width: 128,
    height: 128,
    borderRadius: 34,
    backgroundColor: cores.fundo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nome: { fontFamily: fontes.titulo, fontSize: 30, lineHeight: 36, color: cores.texto, textAlign: 'center', marginTop: 6 },
  dose: { fontFamily: fontes.texto, fontSize: 24, lineHeight: 30, color: cores.textoSuave, textAlign: 'center' },
  como: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, maxWidth: '100%' },
  textoComo: { fontFamily: fontes.textoNegrito, fontSize: 20, lineHeight: 26, textAlign: 'center', color: cores.texto, flexShrink: 1 },
  erro: { fontFamily: fontes.textoNegrito, fontSize: 22, color: cores.alertaTexto, textAlign: 'center' },
  ouvir: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  textoOuvir: { fontFamily: fontes.textoNegrito, fontSize: 22, color: cores.primaria },
  fundoWeb: {
    flex: 1,
    backgroundColor: 'rgba(24,24,28,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  janelaWeb: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '100%',
    backgroundColor: cores.fundo,
    borderRadius: 28,
    overflow: 'hidden',
  },
});

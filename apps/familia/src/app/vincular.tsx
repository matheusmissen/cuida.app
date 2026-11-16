import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Botao, Cartao, cores, Erro, Texto, Titulo } from '@/components/ui';
import { usePaciente } from '@/lib/paciente';
import { supabase } from '@/lib/supabase';

const VALIDADE_MS = 15 * 60_000; // igual ao padrão de codigos_vinculo.expira_em

export default function Vincular() {
  const { paciente, recarregar } = usePaciente();
  const [codigo, setCodigo] = useState<string | null>(null);
  const [expiraEm, setExpiraEm] = useState<number>(0);
  const [agora, setAgora] = useState(Date.now());
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function gerar() {
    if (!paciente) return;
    setErro(null);
    setGerando(true);
    const { data, error } = await supabase.rpc('gerar_codigo_vinculo', { p_paciente: paciente.id });
    setGerando(false);
    if (error) return setErro(error.message);
    setCodigo(data as string);
    setAgora(Date.now());
    setExpiraEm(Date.now() + VALIDADE_MS);
  }

  // Enquanto o código está na tela, verifica se o celular já foi vinculado.
  useEffect(() => {
    if (!codigo) return;
    const timer = setInterval(() => {
      setAgora(Date.now());
      recarregar();
    }, 5_000);
    return () => clearInterval(timer);
  }, [codigo, recarregar]);

  if (!paciente) return null;
  const nome = paciente.apelido || paciente.nome;
  const expirado = codigo !== null && agora > expiraEm;
  const restante = Math.max(0, Math.ceil((expiraEm - agora) / 60_000));

  return (
    <ScrollView contentContainerStyle={estilos.conteudo}>
      <Cartao>
        <Titulo>Vincular o celular de {nome}</Titulo>
        <Texto>
          1. Abra o app Cuida no celular de {nome}.{'\n'}2. Aponte a câmera para o código abaixo ou digite os 6
          números.{'\n'}3. Pronto: os alarmes e a Lia passam a funcionar sozinhos.
        </Texto>
        {paciente.usuario_id && (
          <Text style={{ color: cores.sucesso, fontWeight: '700', fontSize: 16 }}>
            ✓ Já existe um celular vinculado. Um código novo troca para outro aparelho.
          </Text>
        )}
        {codigo && !expirado && (
          <View style={estilos.qr}>
            <QRCode value={`cuida-idoso://vincular?codigo=${codigo}`} size={220} />
            <Text style={estilos.codigo} accessibilityLabel={`Código ${codigo.split('').join(' ')}`}>
              {codigo.slice(0, 3)} {codigo.slice(3)}
            </Text>
            <Texto suave>Vale por mais {restante} min e só pode ser usado uma vez.</Texto>
          </View>
        )}
        {expirado && <Texto suave>O código expirou. Gere outro.</Texto>}
        <Erro mensagem={erro} />
        <Botao titulo={codigo ? 'Gerar novo código' : 'Gerar código'} onPress={gerar} carregando={gerando} />
      </Cartao>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  conteudo: { padding: 16, gap: 16, maxWidth: 640, width: '100%', alignSelf: 'center' },
  qr: { alignItems: 'center', gap: 12, paddingVertical: 12 },
  codigo: { fontSize: 40, fontWeight: '800', letterSpacing: 6, color: cores.texto },
});

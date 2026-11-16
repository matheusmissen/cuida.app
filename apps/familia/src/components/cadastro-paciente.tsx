import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Botao, Campo, Cartao, cores, Erro, Texto, Titulo } from '@/components/ui';
import { usePaciente } from '@/lib/paciente';
import { supabase } from '@/lib/supabase';

export function CadastroPaciente() {
  const { recarregar } = usePaciente();
  const [nome, setNome] = useState('');
  const [apelido, setApelido] = useState('');
  const [seuNome, setSeuNome] = useState('');
  const [leucemia, setLeucemia] = useState(false);
  const [consentiu, setConsentiu] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setErro(null);
    if (nome.trim().length < 2) return setErro('Informe o nome de quem vai ser cuidado.');
    if (!consentiu) return setErro('É preciso confirmar o consentimento para continuar.');
    setEnviando(true);
    const { data: id, error } = await supabase.rpc('criar_paciente', {
      p_nome: nome.trim(),
      p_apelido: apelido.trim() || null,
      p_condicoes: leucemia ? ['leucemia'] : [],
      p_nome_exibicao: seuNome.trim() || null,
    });
    if (!error && id) {
      await supabase.from('pacientes').update({ consentimento_em: new Date().toISOString() }).eq('id', id);
    }
    setEnviando(false);
    if (error) return setErro(error.message);
    await recarregar();
  }

  return (
    <Cartao>
      <Titulo>Quem você vai cuidar?</Titulo>
      <Texto suave>Você será o responsável principal. Depois cadastre os remédios e vincule o celular.</Texto>
      <Campo rotulo="Nome completo" value={nome} onChangeText={setNome} placeholder="Maria Aparecida Souza" />
      <Campo
        rotulo="Como a Lia deve chamar (apelido)"
        value={apelido}
        onChangeText={setApelido}
        placeholder="Dona Maria"
      />
      <Campo rotulo="Seu nome (como aparece para o círculo)" value={seuNome} onChangeText={setSeuNome} placeholder="Lucas (neto)" />
      <Opcao marcada={leucemia} onPress={() => setLeucemia(!leucemia)}>
        Em tratamento de leucemia (ativa alertas de febre e sangramento)
      </Opcao>
      <Opcao marcada={consentiu} onPress={() => setConsentiu(!consentiu)}>
        A pessoa cuidada concordou em usar o Cuida e em compartilhar estes dados de saúde com a família.
      </Opcao>
      <Erro mensagem={erro} />
      <Botao titulo="Cadastrar" onPress={salvar} carregando={enviando} />
    </Cartao>
  );
}

export function Opcao({ marcada, onPress, children }: { marcada: boolean; onPress: () => void; children: string }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcada }}
      onPress={onPress}
      style={estilos.opcao}
    >
      <View style={[estilos.caixa, marcada && estilos.caixaMarcada]}>
        {marcada && <Text style={{ color: '#fff', fontWeight: '800' }}>✓</Text>}
      </View>
      <Text style={estilos.textoOpcao}>{children}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  opcao: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  caixa: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: cores.primaria,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  caixaMarcada: { backgroundColor: cores.primaria },
  textoOpcao: { flex: 1, fontSize: 15, color: cores.texto, lineHeight: 21 },
});

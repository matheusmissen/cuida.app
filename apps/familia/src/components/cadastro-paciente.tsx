import { condicoesParaSalvar, lerTelefone } from '@cuida/cliente';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { CondicoesSaude, formDoPaciente, type FormCondicoes } from '@/components/condicoes-saude';
import { Opcao } from '@/components/opcao';
import { Botao, Campo, Cartao, Erro, Texto, Titulo } from '@/components/ui';
import { usePaciente } from '@/lib/paciente';
import { supabase } from '@/lib/supabase';

// Mantido aqui para as telas que já importam de '@/components/cadastro-paciente'.
export { Opcao } from '@/components/opcao';

export function CadastroPaciente() {
  const { recarregar } = usePaciente();
  const [nome, setNome] = useState('');
  const [apelido, setApelido] = useState('');
  const [seuNome, setSeuNome] = useState('');
  const [condicoes, setCondicoes] = useState<FormCondicoes>(formDoPaciente(null));
  const [telefone, setTelefone] = useState('');
  const [consentiu, setConsentiu] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setErro(null);
    if (nome.trim().length < 2) return setErro('Informe o nome de quem vai ser cuidado.');
    if (!consentiu) return setErro('É preciso confirmar o consentimento para continuar.');
    const tel = telefone.trim() ? lerTelefone(telefone) : null;
    if (telefone.trim() && !tel) return setErro('Telefone inválido. Use o DDD, por exemplo: (11) 98765-4321');
    const saude = condicoesParaSalvar(condicoes);
    setEnviando(true);
    const { data: id, error } = await supabase.rpc('criar_paciente', {
      p_nome: nome.trim(),
      p_apelido: apelido.trim() || null,
      p_condicoes: saude.condicoes,
      p_nome_exibicao: seuNome.trim() || null,
      p_outras_condicoes: saude.outras_condicoes,
    });
    if (!error && id) {
      await supabase.from('pacientes').update({ consentimento_em: new Date().toISOString(), telefone: tel }).eq('id', id);
    }
    setEnviando(false);
    if (error) return setErro(error.message);
    await recarregar();
    router.push('/vincular'); // próximo passo: mandar o link e passar o código de 4 números
  }

  return (
    <View style={{ gap: 12 }}>
    <Cartao>
      <Titulo>Recebeu um convite?</Titulo>
      <Texto suave>Se alguém da família já cadastrou a pessoa e te convidou, entre no grupo com o código.</Texto>
      <Botao variante="secundario" titulo="Tenho um código de convite" onPress={() => router.push('/convite')} />
    </Cartao>
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
      <Campo
        rotulo="Telefone dela ou dele, com DDD (opcional)"
        value={telefone}
        onChangeText={setTelefone}
        placeholder="(11) 98765-4321"
        keyboardType="phone-pad"
      />
      <Campo rotulo="Seu nome (como aparece para o círculo)" value={seuNome} onChangeText={setSeuNome} placeholder="Lucas (neto)" />
      <CondicoesSaude valor={condicoes} aoMudar={setCondicoes} />
      <Opcao marcada={consentiu} onPress={() => setConsentiu(!consentiu)}>
        A pessoa cuidada concordou em usar o Cuida e em compartilhar estes dados de saúde com a família.
      </Opcao>
      <Erro mensagem={erro} />
      <Botao titulo="Cadastrar" onPress={salvar} carregando={enviando} />
    </Cartao>
    </View>
  );
}

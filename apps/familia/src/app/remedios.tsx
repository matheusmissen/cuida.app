import { horaDoBanco, lerHora, type Horario, type Remedio } from '@cuida/cliente';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Opcao } from '@/components/cadastro-paciente';
import { Botao, Campo, Cartao, cores, Erro, Selo, Texto, Titulo } from '@/components/ui';
import { usePaciente } from '@/lib/paciente';
import { supabase } from '@/lib/supabase';

type RemedioComHorarios = Remedio & { horarios: Horario[] };

const DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const DIAS_NOME = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

export default function Remedios() {
  const { paciente } = usePaciente();
  const [remedios, setRemedios] = useState<RemedioComHorarios[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!paciente) return;
    const { data, error } = await supabase
      .from('remedios')
      .select('*, horarios(*)')
      .eq('paciente_id', paciente.id)
      .order('ativo', { ascending: false })
      .order('criado_em');
    setErro(error?.message ?? null);
    setRemedios((data as RemedioComHorarios[]) ?? []);
  }, [paciente]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function alternarAtivo(r: RemedioComHorarios) {
    if (!paciente) return;
    const { error } = await supabase.from('remedios').update({ ativo: !r.ativo }).eq('id', r.id);
    if (error) return setErro(error.message);
    if (r.ativo) {
      // Suspenso: some do alarme. Doses futuras não tomadas são apagadas; o histórico fica.
      await supabase
        .from('doses')
        .delete()
        .in('horario_id', r.horarios.map((h) => h.id))
        .is('confirmado_em', null)
        .gt('previsto_em', new Date().toISOString());
    } else {
      await supabase.rpc('gerar_doses_hoje', { p_paciente: paciente.id });
    }
    carregar();
  }

  if (!paciente) return null;

  return (
    <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
      <NovoRemedio pacienteId={paciente.id} aoSalvar={carregar} />
      <Erro mensagem={erro} />
      {remedios.map((r) => (
        <Cartao key={r.id} style={!r.ativo ? { opacity: 0.6 } : undefined}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Titulo>{r.nome}</Titulo>
              <Texto suave>{r.dose}</Texto>
            </View>
            {r.critico && <Selo texto="Crítico" cor={cores.perigo} fundo="#FDE7EA" />}
          </View>
          <Texto>
            {r.horarios
              .map((h) => horaDoBanco(h.hora))
              .sort()
              .join(' · ') || 'Sem horário'}
            {r.horarios[0] && r.horarios[0].dias_semana.length < 7
              ? ` (${r.horarios[0].dias_semana.map((d) => DIAS_NOME[d]).join(', ')})`
              : ' (todos os dias)'}
          </Texto>
          {r.estoque_doses !== null && <Texto suave>Estoque: {r.estoque_doses} doses</Texto>}
          {!r.ativo && <Texto suave>Suspenso — não toca alarme.</Texto>}
          <Botao
            variante={r.ativo ? 'perigo' : 'secundario'}
            titulo={r.ativo ? 'Suspender' : 'Reativar'}
            onPress={() => alternarAtivo(r)}
          />
        </Cartao>
      ))}
    </ScrollView>
  );
}

function NovoRemedio({ pacienteId, aoSalvar }: { pacienteId: string; aoSalvar: () => void }) {
  const [nome, setNome] = useState('');
  const [dose, setDose] = useState('');
  const [horas, setHoras] = useState('');
  const [estoque, setEstoque] = useState('');
  const [critico, setCritico] = useState(false);
  const [dias, setDias] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setErro(null);
    const lidas = horas.split(/[,;\s]+/).filter(Boolean).map(lerHora);
    if (nome.trim().length < 2 || dose.trim().length < 1) return setErro('Informe o nome e a dose.');
    if (lidas.length === 0 || lidas.some((h) => h === null)) {
      return setErro('Horários inválidos. Use, por exemplo: 08:00, 20:00');
    }
    if (dias.length === 0) return setErro('Escolha pelo menos um dia da semana.');
    const estoqueNum = estoque.trim() ? Number(estoque) : null;
    if (estoqueNum !== null && (!Number.isInteger(estoqueNum) || estoqueNum < 0)) {
      return setErro('Estoque deve ser um número inteiro de doses.');
    }
    setEnviando(true);
    const { data: remedio, error } = await supabase
      .from('remedios')
      .insert({ paciente_id: pacienteId, nome: nome.trim(), dose: dose.trim(), critico, estoque_doses: estoqueNum })
      .select('id')
      .single();
    if (error || !remedio) {
      setEnviando(false);
      return setErro(error?.message ?? 'Não foi possível salvar.');
    }
    const unicas = [...new Set(lidas as string[])];
    const { error: erroHorarios } = await supabase.from('horarios').insert(
      unicas.map((hora) => ({ remedio_id: remedio.id, paciente_id: pacienteId, hora, dias_semana: dias })),
    );
    if (erroHorarios) {
      await supabase.from('remedios').delete().eq('id', remedio.id);
      setEnviando(false);
      return setErro(erroHorarios.message);
    }
    await supabase.rpc('gerar_doses_hoje', { p_paciente: pacienteId });
    setEnviando(false);
    setNome('');
    setDose('');
    setHoras('');
    setEstoque('');
    setCritico(false);
    setDias([0, 1, 2, 3, 4, 5, 6]);
    aoSalvar();
  }

  return (
    <Cartao>
      <Titulo>Novo remédio</Titulo>
      <Campo rotulo="Nome" value={nome} onChangeText={setNome} placeholder="Ex.: Remédio da pressão" />
      <Campo rotulo="Dose" value={dose} onChangeText={setDose} placeholder="Ex.: 1 comprimido" />
      <Campo rotulo="Horários" value={horas} onChangeText={setHoras} placeholder="08:00, 20:00" autoCapitalize="none" />
      <View style={{ gap: 6 }}>
        <Text style={estilos.rotulo}>Dias da semana</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {DIAS.map((d, i) => {
            const marcado = dias.includes(i);
            return (
              <Pressable
                key={i}
                accessibilityRole="checkbox"
                accessibilityLabel={DIAS_NOME[i]}
                accessibilityState={{ checked: marcado }}
                onPress={() => setDias(marcado ? dias.filter((x) => x !== i) : [...dias, i].sort())}
                style={[estilos.dia, marcado && estilos.diaMarcado]}
              >
                <Text style={{ color: marcado ? '#fff' : cores.primaria, fontWeight: '700' }}>{d}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Campo rotulo="Estoque (doses, opcional)" value={estoque} onChangeText={setEstoque} keyboardType="number-pad" />
      <Opcao marcada={critico} onPress={() => setCritico(!critico)}>
        Remédio crítico (dose perdida avisa todo o círculo na hora)
      </Opcao>
      <Erro mensagem={erro} />
      <Botao titulo="Adicionar remédio" onPress={salvar} carregando={enviando} />
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  conteudo: { padding: 16, gap: 16, maxWidth: 640, width: '100%', alignSelf: 'center', paddingBottom: 48 },
  rotulo: { fontSize: 14, fontWeight: '600', color: cores.suave },
  dia: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: cores.primaria,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaMarcado: { backgroundColor: cores.primaria },
});

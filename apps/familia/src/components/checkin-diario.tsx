// Check-in diário no painel da família: horário em que a Lia chama, situação de hoje
// (mesma conta do servidor) e o que chamou atenção no último check-in.
import {
  horaCurta,
  horaDoBanco,
  lerHora,
  resumoDoCheckin,
  type CheckinLinha,
} from '@cuida/cliente';
import { situacaoDoCheckin, tentativasDoCheckin } from '@cuida/regras';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Botao, Campo, Cartao, cores, Erro, Selo, Texto, Titulo } from '@/components/ui';
import { usePaciente } from '@/lib/paciente';
import { supabase } from '@/lib/supabase';

export function CheckinDiario({ ultimo, agora }: { ultimo: CheckinLinha | null; agora: Date }) {
  const { paciente, recarregar } = usePaciente();
  const [editando, setEditando] = useState(false);
  const [hora, setHora] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  if (!paciente) return null;

  const horario = paciente.horario_checkin;
  let situacao = null;
  try {
    situacao = horario ? situacaoDoCheckin(horario, agora, ultimo?.feito_em ?? null) : null;
  } catch {
    situacao = null;
  }
  const nome = paciente.apelido || paciente.nome;

  async function salvar(novo: string | null) {
    setErro(null);
    setSalvando(true);
    const { error } = await supabase.from('pacientes').update({ horario_checkin: novo }).eq('id', paciente!.id);
    setSalvando(false);
    if (error) return setErro(error.message);
    setEditando(false);
    await recarregar();
  }

  let status: { texto: string; cor: string; fundo: string } | null = null;
  if (situacao?.feito && ultimo) {
    status = { texto: `Feito às ${horaCurta(ultimo.feito_em)}`, cor: cores.sucesso, fundo: '#E3F4EC' };
  } else if (situacao?.alerta) {
    status = { texto: 'Sem resposta — família avisada', cor: '#B45309', fundo: '#FEF0DC' };
  } else if (situacao?.aguardando && horario) {
    const [t1] = tentativasDoCheckin(horario, agora);
    status = { texto: `A Lia chamou às ${horaCurta(t1.toISOString())}, aguardando`, cor: '#8A6D00', fundo: '#FFF8D6' };
  } else if (horario) {
    status = { texto: `Hoje às ${horaDoBanco(horario)}`, cor: cores.suave, fundo: '#EEF2F6' };
  }

  const resumo = ultimo ? resumoDoCheckin(ultimo) : [];

  return (
    <Cartao>
      <Titulo>Check-in diário</Titulo>
      {horario ? (
        <Texto suave>
          A Lia chama {nome} às {horaDoBanco(horario)} e de novo 30 min depois. Sem resposta em 1 h, o responsável
          principal é avisado.
        </Texto>
      ) : (
        <Texto suave>Check-in diário desligado.</Texto>
      )}
      {status && <Selo texto={status.texto} cor={status.cor} fundo={status.fundo} />}

      {ultimo && (
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: cores.texto }}>
            Último check-in: {new Date(ultimo.feito_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} às{' '}
            {horaCurta(ultimo.feito_em)}
          </Text>
          {resumo.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {resumo.map((r) => (
                <Selo key={r} texto={r} cor="#B00020" fundo="#FDE7EA" />
              ))}
            </View>
          ) : (
            <Texto suave>Nenhum sintoma relatado.</Texto>
          )}
          {ultimo.sono ? <Texto suave>Sono: {ultimo.sono}</Texto> : null}
          {ultimo.notas ? <Texto suave>Notas: {ultimo.notas}</Texto> : null}
        </View>
      )}

      {editando ? (
        <View style={{ gap: 10 }}>
          <Campo rotulo="Horário do check-in" value={hora} onChangeText={setHora} placeholder="09:00" autoCapitalize="none" />
          <Erro mensagem={erro} />
          <Botao
            titulo="Salvar horário"
            carregando={salvando}
            onPress={() => {
              const lida = lerHora(hora);
              if (!lida) return setErro('Horário inválido. Use, por exemplo: 09:00');
              salvar(lida);
            }}
          />
          {horario && <Botao variante="perigo" titulo="Desligar check-in diário" onPress={() => salvar(null)} />}
          <Botao variante="secundario" titulo="Cancelar" onPress={() => setEditando(false)} />
        </View>
      ) : (
        <Botao
          variante="secundario"
          titulo={horario ? 'Mudar horário' : 'Ligar check-in diário'}
          onPress={() => {
            setHora(horario ? horaDoBanco(horario) : '09:00');
            setErro(null);
            setEditando(true);
          }}
        />
      )}
    </Cartao>
  );
}

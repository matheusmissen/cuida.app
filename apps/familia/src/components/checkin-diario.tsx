// Check-in diário na família: o cartão do painel ("Último check-in") e o ajuste de horário.
// A situação de hoje usa situacaoDoCheckin (packages/regras), a mesma conta do servidor.
import { horaCurta, horaDoBanco, lerHora, resumoDoCheckin, type CheckinLinha } from '@cuida/cliente';
import { minutosPorExtenso, situacaoDoCheckin, temposDoPaciente, tentativasDoCheckin, type Tempos } from '@cuida/regras';
import { rostinhos, SeloRostinho, type NivelRostinho } from '@cuida/visual';
import { useState } from 'react';
import { View } from 'react-native';
import { Botao, Campo, Cartao, Erro, Selo, Texto, Titulo } from '@/components/ui';
import { usePaciente } from '@/lib/paciente';
import { supabase } from '@/lib/supabase';
import { paleta } from '@/lib/tema';

function statusDeHoje(horario: string | null, ultimo: CheckinLinha | null, agora: Date, tempos: Tempos) {
  if (!horario) return null;
  let s;
  try {
    s = situacaoDoCheckin(horario, agora, ultimo?.feito_em ?? null, tempos);
  } catch {
    return null;
  }
  if (s.feito && ultimo) return { texto: `Feito às ${horaCurta(ultimo.feito_em)}`, cor: paleta.salvia.texto, fundo: paleta.salvia.fundo };
  if (s.alerta) return { texto: 'Sem resposta, família avisada', cor: paleta.alerta.texto, fundo: paleta.alerta.fundo };
  if (s.aguardando) {
    const [t1] = tentativasDoCheckin(horario, agora);
    return { texto: `A Lia chamou às ${horaCurta(t1.toISOString())}`, cor: paleta.lilas.texto, fundo: paleta.lilas.fundo };
  }
  return { texto: `Hoje às ${horaDoBanco(horario)}`, cor: paleta.textoSuave, fundo: paleta.superficieNeutra };
}

/** Cartão do painel: último check-in, o que chamou atenção e a situação de hoje. */
export function CartaoUltimoCheckin({ ultimo, agora }: { ultimo: CheckinLinha | null; agora: Date }) {
  const { paciente } = usePaciente();
  if (!paciente) return null;
  const status = statusDeHoje(paciente.horario_checkin, ultimo, agora, temposDoPaciente(paciente));
  const resumo = ultimo ? resumoDoCheckin(ultimo) : [];
  const deHoje =
    ultimo &&
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(ultimo.feito_em)) ===
      new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(agora);

  return (
    <Cartao style={{ gap: 8 }}>
      <Titulo>
        {ultimo
          ? `Último check-in · ${deHoje ? '' : new Date(ultimo.feito_em).toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric', timeZone: 'America/Sao_Paulo' }) + ' '}${horaCurta(ultimo.feito_em)}`
          : 'Check-in diário'}
      </Titulo>
      {ultimo ? (
        <>
          {ultimo.nivel ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <SeloRostinho nivel={ultimo.nivel as NivelRostinho} />
              <Texto style={{ flex: 1 }}>
                Respondeu <Texto negrito>{rostinhos[ultimo.nivel as NivelRostinho].rotulo}</Texto>
                {ultimo.nivel >= 4 ? '. A Lia entrou na conversa.' : '.'}
              </Texto>
            </View>
          ) : null}
          {resumo.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {resumo.map((r) => (
                <Selo key={r} texto={r} cor={paleta.alerta.texto} fundo={paleta.alerta.fundo} />
              ))}
            </View>
          ) : (
            <Texto suave>Nenhum sintoma relatado.</Texto>
          )}
          {ultimo.notas ? <Texto suave>{ultimo.notas}</Texto> : null}
          {ultimo.sono ? <Texto suave>Sono: {ultimo.sono}</Texto> : null}
        </>
      ) : (
        <Texto suave>Ainda não houve check-in.</Texto>
      )}
      {status && <Selo texto={status.texto} cor={status.cor} fundo={status.fundo} />}
    </Cartao>
  );
}

/** Ajustes: horário em que a Lia chama para o check-in (ou desligar). */
export function HorarioCheckin() {
  const { paciente, recarregar } = usePaciente();
  const [editando, setEditando] = useState(false);
  const [hora, setHora] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  if (!paciente) return null;
  const horario = paciente.horario_checkin;
  const nome = paciente.apelido || paciente.nome;
  const tempos = temposDoPaciente(paciente);

  async function salvar(novo: string | null) {
    setErro(null);
    setSalvando(true);
    const { error } = await supabase.from('pacientes').update({ horario_checkin: novo }).eq('id', paciente!.id);
    setSalvando(false);
    if (error) return setErro(error.message);
    setEditando(false);
    await recarregar();
  }

  return (
    <Cartao>
      <Titulo>Check-in diário</Titulo>
      {horario ? (
        <Texto suave>
          A Lia chama {nome} às {horaDoBanco(horario)}. Sem resposta em {minutosPorExtenso(tempos.toleranciaCheckinMin)}, o
          responsável principal é avisado; se ele não agir em {minutosPorExtenso(tempos.escaladaMin)}, todo o grupo.
        </Texto>
      ) : (
        <Texto suave>Check-in diário desligado.</Texto>
      )}
      {editando ? (
        <View style={{ gap: 10 }}>
          <Campo rotulo="Horário do check-in" value={hora} onChangeText={setHora} placeholder="08:00" autoCapitalize="none" />
          <Erro mensagem={erro} />
          <Botao
            titulo="Salvar horário"
            carregando={salvando}
            onPress={() => {
              const lida = lerHora(hora);
              if (!lida) return setErro('Horário inválido. Use, por exemplo: 08:00');
              salvar(lida);
            }}
          />
          {horario && <Botao variante="secundario" titulo="Desligar check-in diário" onPress={() => salvar(null)} />}
          <Botao variante="texto" titulo="Cancelar" onPress={() => setEditando(false)} />
        </View>
      ) : (
        <Botao
          variante="secundario"
          titulo={horario ? 'Mudar horário' : 'Ligar check-in diário'}
          onPress={() => {
            setHora(horario ? horaDoBanco(horario) : '08:00');
            setErro(null);
            setEditando(true);
          }}
        />
      )}
    </Cartao>
  );
}

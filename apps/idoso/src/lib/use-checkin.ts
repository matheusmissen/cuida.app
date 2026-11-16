// Check-in diário: a Lia chama no horário que a família configurou e de novo 30 min depois.
// A conta é a mesma do servidor (situacaoDoCheckin), que alerta a família se não houver resposta.
import { fraseDoCheckin, instantesDoCheckin } from '@cuida/cliente';
import { situacaoDoCheckin, type SituacaoCheckin } from '@cuida/regras';
import { useCallback, useEffect, useRef, useState } from 'react';
import { agendarCheckin } from './alarmes';
import { supabase } from './supabase';

export interface ConviteCheckin {
  /** Muda a cada tentativa (dia + tentativa): a Lia chama uma vez por chave. */
  chave: string;
  frase: string;
}

export function useCheckin(pacienteId: string, apelido: string, horario: string | null, agora: Date) {
  const [ultimoCheckinEm, setUltimoCheckinEm] = useState<string | null>(null);
  const [carregado, setCarregado] = useState(false);
  const assinatura = useRef('');

  const recarregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('checkins')
      .select('feito_em')
      .eq('paciente_id', pacienteId)
      .order('feito_em', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return; // sem internet: mantém o que já sabia
    setUltimoCheckinEm(data?.feito_em ?? null);
    setCarregado(true);
  }, [pacienteId]);

  useEffect(() => {
    recarregar();
    const timer = setInterval(recarregar, 60_000);
    return () => clearInterval(timer);
  }, [recarregar]);

  let situacao: SituacaoCheckin | null = null;
  if (horario && carregado) {
    try {
      situacao = situacaoDoCheckin(horario, agora, ultimoCheckinEm);
    } catch {
      situacao = null; // horário inválido: o servidor também ignora
    }
  }

  // Lembretes no celular (funcionam com o app fechado).
  const feitoHoje = Boolean(situacao?.feito);
  useEffect(() => {
    if (!carregado) return;
    const instantes = instantesDoCheckin(horario, new Date(), feitoHoje);
    const nova = `${horario}|${feitoHoje}|${instantes.map((d) => d.getTime()).join(',')}`;
    if (nova === assinatura.current) return;
    assinatura.current = nova;
    agendarCheckin(instantes).catch((e) => console.warn('Check-in:', e?.message ?? e));
  }, [horario, feitoHoje, carregado]);

  const convite: ConviteCheckin | null =
    situacao?.aguardando && situacao.tentativa > 0
      ? {
          chave: `${agora.toDateString()}-${situacao.tentativa}`,
          frase: fraseDoCheckin(apelido, situacao.tentativa as 1 | 2, agora),
        }
      : null;

  return { convite, recarregar };
}

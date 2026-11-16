// Conversa com a Lia: ouve, transcreve no aparelho, chama a Edge Function `agente`
// com o histórico e fala a resposta (que também aparece em letra grande via useUltimaFala).
import {
  adicionarFala,
  corpoDoAgente,
  FRASE_SEM_CONEXAO,
  lerRespostaDoAgente,
  type Fala,
} from '@cuida/cliente';
import { useCallback, useEffect, useRef, useState } from 'react';
import { escutaDisponivel, ouvir, pedirPermissaoDeEscuta } from './escuta';
import { supabase } from './supabase';
import { falar, pararFala } from './voz';

export type EstadoConversa = 'parada' | 'ouvindo' | 'pensando';

export function useConversa() {
  const [estado, setEstado] = useState<EstadoConversa>('parada');
  const [ouvindoAgora, setOuvindoAgora] = useState('');
  const [disse, setDisse] = useState<string | null>(null);
  const historico = useRef<Fala[]>([]);
  const encerrar = useRef<(() => void) | null>(null);
  const [podeOuvir] = useState(escutaDisponivel);

  useEffect(() => () => encerrar.current?.(), []);

  const enviar = useCallback(async (texto: string) => {
    const limpo = texto.trim();
    if (!limpo) return;
    setDisse(limpo);
    setEstado('pensando');
    const { data, error } = await supabase.functions.invoke('agente', {
      body: corpoDoAgente(limpo, historico.current),
    });
    const resposta = error ? null : lerRespostaDoAgente(data);
    setEstado('parada');
    if (!resposta) {
      // Sem resposta, a fala não entra no histórico: na próxima vez a Lia recebe tudo de novo.
      console.warn('agente:', error?.message ?? 'resposta fora do contrato');
      falar(FRASE_SEM_CONEXAO);
      return;
    }
    historico.current = adicionarFala(
      adicionarFala(historico.current, { papel: 'idoso', texto: limpo }),
      { papel: 'lia', texto: resposta.resposta },
    );
    falar(resposta.resposta);
  }, []);

  const comecar = useCallback(async () => {
    if (estado !== 'parada') return;
    pararFala();
    if (!(await pedirPermissaoDeEscuta())) {
      falar('Preciso de permissão para usar o microfone. Peça ajuda para a sua família.');
      return;
    }
    setOuvindoAgora('');
    setDisse(null);
    setEstado('ouvindo');
    encerrar.current = ouvir({
      parcial: setOuvindoAgora,
      final: (texto) => {
        setOuvindoAgora('');
        enviar(texto);
      },
      erro: (mensagem) => falar(mensagem),
      fim: () => {
        encerrar.current = null;
        setOuvindoAgora('');
        setEstado((e) => (e === 'ouvindo' ? 'parada' : e));
      },
    });
  }, [estado, enviar]);

  /** Segundo toque no botão: termina de ouvir e envia o que foi dito. */
  const terminar = useCallback(() => encerrar.current?.(), []);

  return { estado, podeOuvir, ouvindoAgora, disse, comecar, terminar, enviar };
}

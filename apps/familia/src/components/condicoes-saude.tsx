// Condições de saúde: usado no cadastro do paciente e em Ajustes.
// Só as condições do catálogo ligam alertas; a tela separa as que têm alertas automáticos das que são
// só registro, e o texto livre avisa que nunca gera alerta (packages/cliente/src/condicoes.ts).
import {
  CONDICOES_COM_ALERTAS,
  CONDICOES_SO_REGISTRO,
  MAX_OUTRAS_CONDICOES,
} from '@cuida/cliente';
import { View } from 'react-native';
import { Escolha, Opcao } from '@/components/opcao';
import { Campo, Texto } from '@/components/ui';

export interface FormCondicoes {
  possui: boolean;
  selecionadas: string[];
  outras: string;
}

export function formDoPaciente(p: { condicoes: string[]; outras_condicoes: string | null } | null): FormCondicoes {
  const selecionadas = p?.condicoes ?? [];
  const outras = p?.outras_condicoes ?? '';
  return { possui: selecionadas.length > 0 || outras.length > 0, selecionadas, outras };
}

export function CondicoesSaude({ valor, aoMudar }: { valor: FormCondicoes; aoMudar: (v: FormCondicoes) => void }) {
  const alternar = (codigo: string) =>
    aoMudar({
      ...valor,
      selecionadas: valor.selecionadas.includes(codigo)
        ? valor.selecionadas.filter((c) => c !== codigo)
        : [...valor.selecionadas, codigo],
    });

  return (
    <View style={{ gap: 12 }}>
      <Texto negrito>Possui alguma doença ou condição de saúde?</Texto>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 10 }}>
        <Escolha marcada={valor.possui} onPress={() => aoMudar({ ...valor, possui: true })}>
          Sim
        </Escolha>
        <Escolha marcada={!valor.possui} onPress={() => aoMudar({ ...valor, possui: false })}>
          Não
        </Escolha>
      </View>

      {valor.possui && (
        <View style={{ gap: 12 }}>
          <Texto negrito>Com alertas automáticos</Texto>
          {CONDICOES_COM_ALERTAS.map((c) => (
            <Opcao key={c.codigo} marcada={valor.selecionadas.includes(c.codigo)} onPress={() => alternar(c.codigo)}>
              {`${c.rotulo} (${c.alertas!.toLowerCase()})`}
            </Opcao>
          ))}

          <Texto negrito>Outras condições comuns</Texto>
          <Texto suave>Ficam registradas para a família e o médico. Ainda não geram alertas próprios.</Texto>
          {CONDICOES_SO_REGISTRO.map((c) => (
            <Opcao key={c.codigo} marcada={valor.selecionadas.includes(c.codigo)} onPress={() => alternar(c.codigo)}>
              {c.rotulo}
            </Opcao>
          ))}

          <Campo
            rotulo="Outras condições (escreva)"
            value={valor.outras}
            onChangeText={(outras) => aoMudar({ ...valor, outras })}
            placeholder="Ex.: artrose, catarata"
            maxLength={MAX_OUTRAS_CONDICOES}
            multiline
          />
          <Texto suave>O que for escrito aqui fica registrado, mas não gera alertas automáticos.</Texto>
        </View>
      )}
    </View>
  );
}

// Barra de abas embaixo: fundo branco, borda superior de 1,5 px.
// Aba ativa: pílula verde-petróleo com ícone e texto brancos. Inativas: #3E4744. Sempre ícone + texto.
import type { ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { alturas, bordas, cores, fontes, tamanhos } from '../tema.ts';
import type { IconeProps } from './icones.tsx';

export interface Aba<C extends string = string> {
  chave: C;
  rotulo: string;
  Icone: ComponentType<IconeProps>;
  /** Mostra o ponto de notificação (cor de alerta) e entra no rótulo acessível. */
  novidades?: number;
}

export interface BarraAbasProps<C extends string> {
  abas: Aba<C>[];
  ativa: C;
  aoTrocar: (chave: C) => void;
}

export function BarraAbas<C extends string>({ abas, ativa, aoTrocar }: BarraAbasProps<C>) {
  return (
    <View style={estilos.barra} accessibilityRole="tablist">
      {abas.map(({ chave, rotulo, Icone, novidades = 0 }) => {
        const ativo = chave === ativa;
        const cor = ativo ? cores.sobrePrimaria : cores.textoSuave;
        const rotuloAcessivel = novidades > 0 ? `${rotulo}, ${novidades} ${novidades > 1 ? 'novos' : 'novo'}` : rotulo;
        return (
          <Pressable
            key={chave}
            accessibilityRole="tab"
            accessibilityLabel={rotuloAcessivel}
            accessibilityState={{ selected: ativo }}
            onPress={() => !ativo && aoTrocar(chave)}
            style={[estilos.aba, ativo && estilos.abaAtiva]}
          >
            <View>
              <Icone tamanho={22} cor={cor} />
              {novidades > 0 && !ativo ? <View style={estilos.ponto} /> : null}
            </View>
            <Text style={[estilos.rotulo, { color: cor }]} numberOfLines={1}>
              {rotulo}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    backgroundColor: cores.superficie,
    borderTopWidth: bordas.cartao,
    borderTopColor: cores.borda,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 4,
  },
  aba: {
    flex: 1,
    minHeight: alturas.toqueFamilia + 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingVertical: 6,
    gap: 2,
  },
  abaAtiva: { backgroundColor: cores.primaria },
  rotulo: { fontFamily: fontes.textoNegrito, fontSize: tamanhos.familia.minimo },
  ponto: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: cores.alertaForte,
    borderWidth: 2,
    borderColor: cores.superficie,
  },
});

// Barra de navegação flutuante em pílula (Hoje, Remédios, Alertas, Ajustes).
// Só o item ativo mostra o nome; os outros têm accessibilityLabel.
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { IconeAjustes, IconeCasa, IconePilula, IconeSino } from '@/components/icones';
import { fontes, paleta } from '@/lib/tema';

export type Aba = 'hoje' | 'remedios' | 'alertas' | 'ajustes';

const ITENS: { aba: Aba; nome: string; Icone: typeof IconeCasa; ir: () => void }[] = [
  { aba: 'hoje', nome: 'Hoje', Icone: IconeCasa, ir: () => router.navigate('/') },
  { aba: 'remedios', nome: 'Remédios', Icone: IconePilula, ir: () => router.navigate('/remedios') },
  { aba: 'alertas', nome: 'Alertas', Icone: IconeSino, ir: () => router.navigate({ pathname: '/', params: { vista: 'alertas' } }) },
  { aba: 'ajustes', nome: 'Ajustes', Icone: IconeAjustes, ir: () => router.navigate('/ajustes') },
];

export function BarraNavegacao({ ativa, alertasNovos = 0 }: { ativa: Aba; alertasNovos?: number }) {
  return (
    <View style={estilos.posicao} pointerEvents="box-none">
      <View style={estilos.barra} accessibilityRole="tablist" aria-label="Navegação principal">
        {ITENS.map(({ aba, nome, Icone, ir }) => {
          const ativo = aba === ativa;
          const rotulo = aba === 'alertas' && alertasNovos > 0 ? `${nome}, ${alertasNovos} novo${alertasNovos > 1 ? 's' : ''}` : nome;
          return (
            <Pressable
              key={aba}
              accessibilityRole="tab"
              accessibilityLabel={rotulo}
              accessibilityState={{ selected: ativo }}
              onPress={ativo ? undefined : ir}
              style={[estilos.item, ativo && estilos.itemAtivo]}
            >
              <Icone tamanho={ativo ? 20 : 22} cor={ativo ? paleta.sobreTinta : paleta.textoSecundario} />
              {ativo && <Text style={estilos.nome}>{nome}</Text>}
              {aba === 'alertas' && alertasNovos > 0 && !ativo && <View style={estilos.ponto} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Espaço no fim das telas para o conteúdo não ficar atrás da barra. */
export const ESPACO_BARRA = 96;

const estilos = StyleSheet.create({
  posicao: { position: 'absolute', left: 0, right: 0, bottom: 18, alignItems: 'center' },
  barra: {
    backgroundColor: paleta.cartao,
    borderRadius: 999,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    boxShadow: '0 1px 2px rgba(24,24,28,0.05), 0 12px 28px rgba(24,24,28,0.10)',
  },
  item: { minWidth: 56, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  itemAtivo: { backgroundColor: paleta.tinta, paddingLeft: 16, paddingRight: 20, gap: 8 },
  nome: { fontFamily: fontes.textoNegrito, fontSize: 15, color: paleta.sobreTinta },
  ponto: {
    position: 'absolute',
    top: 10,
    right: 14,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: paleta.alerta.forte,
    boxShadow: `0 0 0 2px ${paleta.cartao}`,
  },
});

// Barra de abas embaixo (Variação E, docs/design.md): Hoje, Remédios, Documentos, Alertas e Ajustes.
// Usa a BarraAbas de @cuida/visual: aba ativa em pílula verde-petróleo, sempre ícone + texto.
import { BarraAbas, cores, IconeCasa, IconePilula, IconeSino } from '@cuida/visual';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { IconeAjustes, IconeDocumento } from '@/components/icones';

export type Aba = 'hoje' | 'remedios' | 'documentos' | 'alertas' | 'ajustes';

const IR: Record<Aba, () => void> = {
  hoje: () => router.navigate('/'),
  remedios: () => router.navigate('/remedios'),
  documentos: () => router.navigate('/documentos'),
  alertas: () => router.navigate({ pathname: '/', params: { vista: 'alertas' } }),
  ajustes: () => router.navigate('/ajustes'),
};

export function BarraNavegacao({ ativa, alertasNovos = 0 }: { ativa: Aba; alertasNovos?: number }) {
  return (
    <View style={estilos.posicao}>
      <View style={estilos.largura}>
        <BarraAbas<Aba>
          ativa={ativa}
          aoTrocar={(aba) => IR[aba]()}
          abas={[
            { chave: 'hoje', rotulo: 'Hoje', Icone: IconeCasa },
            { chave: 'remedios', rotulo: 'Remédios', Icone: IconePilula },
            { chave: 'documentos', rotulo: 'Arquivos', Icone: IconeDocumento },
            { chave: 'alertas', rotulo: 'Alertas', Icone: IconeSino, novidades: alertasNovos },
            { chave: 'ajustes', rotulo: 'Ajustes', Icone: IconeAjustes },
          ]}
        />
      </View>
    </View>
  );
}

/** Espaço no fim das telas para o conteúdo não ficar atrás da barra. */
export const ESPACO_BARRA = 96;

const estilos = StyleSheet.create({
  posicao: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: cores.superficie },
  largura: { maxWidth: 640, width: '100%', alignSelf: 'center' },
});

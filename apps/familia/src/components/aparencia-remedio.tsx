// Como é o remédio (docs/PRD.md, seção 5): cor e formato do comprimido e foto da caixa.
// O idoso vê isso na hora do remédio, para reconhecer o que tomar.
import { CORES_COMPRIMIDO, descricaoDoComprimido, FORMATOS_COMPRIMIDO, type CorComprimido } from '@cuida/cliente';
import { DesenhoComprimido } from '@cuida/visual';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Botao, cores, Erro, Texto } from '@/components/ui';
import type { ArquivoEscolhido } from '@/lib/documentos';
import { tirarFoto } from '@/lib/documentos';
import { escolherFotoDaGaleria, useFotoRemedio } from '@/lib/remedios';
import { fontes, paleta } from '@/lib/tema';

export interface Aparencia {
  cor: string | null;
  formato: string | null;
  /** Foto nova escolhida agora (ainda não enviada). */
  fotoNova: ArquivoEscolhido | null;
}

export const APARENCIA_VAZIA: Aparencia = { cor: null, formato: null, fotoNova: null };

function Bolinha({ cor }: { cor: CorComprimido }) {
  return (
    <View
      style={[
        estilos.bolinha,
        { backgroundColor: cor.hex },
        cor.codigo === 'colorido' && { borderRightColor: '#F6D35B', borderRightWidth: 9 },
      ]}
    />
  );
}

export function EscolhaAparencia({
  valor,
  aoMudar,
  fotoAtual,
  erro,
  aoErro,
}: {
  valor: Aparencia;
  aoMudar: (a: Aparencia) => void;
  /** Caminho da foto que já está salva (remédio existente). */
  fotoAtual?: string | null;
  erro?: string | null;
  aoErro?: (mensagem: string | null) => void;
}) {
  const urlAtual = useFotoRemedio(valor.fotoNova ? null : fotoAtual);
  const previa = valor.fotoNova?.uri ?? urlAtual;
  const descricao = descricaoDoComprimido(valor.cor, valor.formato);
  const cor = CORES_COMPRIMIDO.find((c) => c.codigo === valor.cor);

  async function foto(origem: 'camera' | 'galeria') {
    aoErro?.(null);
    const r = origem === 'camera' ? await tirarFoto() : await escolherFotoDaGaleria();
    if (!r) return;
    if ('erro' in r) return aoErro?.(r.erro);
    aoMudar({ ...valor, fotoNova: r });
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 6 }}>
        <Text style={estilos.rotulo}>Formato</Text>
        <View style={estilos.linha}>
          {FORMATOS_COMPRIMIDO.map((f) => {
            const marcado = valor.formato === f.codigo;
            return (
              <Pressable
                key={f.codigo}
                accessibilityRole="radio"
                accessibilityState={{ checked: marcado }}
                onPress={() => aoMudar({ ...valor, formato: marcado ? null : f.codigo })}
                style={[estilos.opcao, marcado && estilos.marcada]}
              >
                <Text style={[estilos.textoOpcao, marcado && { color: paleta.sobreTinta }]}>{f.nome}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={estilos.rotulo}>Cor</Text>
        <View style={estilos.linha}>
          {CORES_COMPRIMIDO.map((c) => {
            const marcado = valor.cor === c.codigo;
            return (
              <Pressable
                key={c.codigo}
                accessibilityRole="radio"
                accessibilityLabel={c.nome}
                accessibilityState={{ checked: marcado }}
                onPress={() => aoMudar({ ...valor, cor: marcado ? null : c.codigo })}
                style={[estilos.opcao, estilos.opcaoCor, marcado && estilos.marcada]}
              >
                <Bolinha cor={c} />
                <Text style={[estilos.textoOpcao, marcado && { color: paleta.sobreTinta }]}>{c.nome}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={estilos.previa}>
        {previa ? (
          <Image source={{ uri: previa }} style={estilos.foto} contentFit="cover" accessibilityLabel="Foto da caixa" />
        ) : (
          <View style={estilos.semFoto}>
            <DesenhoComprimido formato={valor.formato} cor={cor?.hex} duasCores={valor.cor === 'colorido'} tamanho={64} />
          </View>
        )}
        <View style={{ flex: 1, gap: 4 }}>
          <Texto>{descricao ?? 'Escolha o formato e a cor.'}</Texto>
          <Texto suave>{previa ? 'Foto da caixa escolhida.' : 'Sem foto da caixa.'}</Texto>
        </View>
      </View>
      <View style={estilos.linha}>
        <View style={{ flex: 1 }}>
          <Botao variante="secundario" titulo="Fotografar a caixa" onPress={() => foto('camera')} />
        </View>
        <View style={{ flex: 1 }}>
          <Botao variante="secundario" titulo="Escolher foto" onPress={() => foto('galeria')} />
        </View>
      </View>
      <Erro mensagem={erro ?? null} />
    </View>
  );
}

const estilos = StyleSheet.create({
  rotulo: { fontSize: 14, fontFamily: fontes.textoNegrito, color: cores.secundario },
  linha: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcao: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: cores.borda,
    backgroundColor: paleta.cartao,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opcaoCor: { flexDirection: 'row', gap: 8, paddingLeft: 10 },
  marcada: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  textoOpcao: { fontFamily: fontes.textoNegrito, fontSize: 15, color: cores.texto },
  bolinha: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#1C2321', overflow: 'hidden' },
  previa: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  foto: { width: 72, height: 72, borderRadius: 16 },
  semFoto: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: paleta.superficieNeutra,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Como é o remédio (docs/PRD.md, seção 5): cor e formato do comprimido e foto da caixa.
// O idoso vê isso na hora do remédio, para reconhecer o que tomar.
import { CORES_COMPRIMIDO, descricaoDoComprimido, FORMATOS_COMPRIMIDO, type CorComprimido } from '@cuida/cliente';
import { DesenhoComprimido, IconeConfirmado } from '@cuida/visual';
import { useState, type ReactNode } from 'react';
import { Image } from 'expo-image';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Botao, cores, Erro, Texto } from '@/components/ui';
import type { ArquivoEscolhido } from '@/lib/documentos';
import { tirarFoto } from '@/lib/documentos';
import { escolherFotoDaGaleria, useFotoRemedio } from '@/lib/remedios';
import { fontes, paleta, raios } from '@/lib/tema';

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
        cor.codigo === 'colorido' && { borderRightColor: '#F6D35B', borderRightWidth: 11 },
      ]}
    />
  );
}

/**
 * Lista suspensa: o campo mostra a opção escolhida; ao tocar, abre uma janela com as opções, uma por
 * linha. Tocar numa opção escolhe e fecha. Funciona igual no celular e no navegador.
 */
function Suspensa({
  rotulo,
  opcoes,
  valor,
  aoEscolher,
}: {
  rotulo: string;
  opcoes: { codigo: string; nome: string; desenho: ReactNode }[];
  valor: string | null;
  aoEscolher: (codigo: string | null) => void;
}) {
  const [aberta, setAberta] = useState(false);
  const atual = opcoes.find((o) => o.codigo === valor) ?? null;
  const escolher = (codigo: string | null) => {
    aoEscolher(codigo);
    setAberta(false);
  };
  return (
    <View style={{ gap: 6 }}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${rotulo}: ${atual ? atual.nome : 'escolher'}`}
        onPress={() => setAberta(true)}
        style={({ pressed }) => [estilos.campo, pressed && { opacity: 0.85 }]}
      >
        {atual ? <View style={estilos.desenhoItem}>{atual.desenho}</View> : null}
        <Text style={[estilos.textoItem, !atual && { color: cores.suave, fontFamily: fontes.texto }]} numberOfLines={1}>
          {atual ? atual.nome : 'Escolher'}
        </Text>
        <Text style={estilos.seta} accessibilityElementsHidden>
          ▾
        </Text>
      </Pressable>

      <Modal visible={aberta} transparent animationType="fade" onRequestClose={() => setAberta(false)}>
        <Pressable style={estilos.fundo} onPress={() => setAberta(false)} accessibilityLabel="Fechar">
          <Pressable style={estilos.janela} onPress={() => {}} accessibilityViewIsModal>
            <Text style={estilos.tituloJanela}>{rotulo}</Text>
            <ScrollView style={{ maxHeight: 440 }} contentContainerStyle={estilos.lista}>
              {opcoes.map((o, i) => {
                const marcado = valor === o.codigo;
                return (
                  <Pressable
                    key={o.codigo}
                    accessibilityRole="radio"
                    accessibilityLabel={o.nome}
                    accessibilityState={{ checked: marcado }}
                    onPress={() => escolher(o.codigo)}
                    style={({ pressed }) => [
                      estilos.item,
                      i > 0 && estilos.itemComDivisor,
                      marcado && estilos.itemMarcado,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <View style={estilos.desenhoItem}>{o.desenho}</View>
                    <Text style={estilos.textoItem} numberOfLines={1}>
                      {o.nome}
                    </Text>
                    <View style={[estilos.radio, marcado && estilos.radioMarcado]}>
                      {marcado ? <IconeConfirmado tamanho={16} cor={paleta.sobreTinta} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
            {valor ? <Botao variante="texto" titulo="Deixar sem escolha" onPress={() => escolher(null)} /> : null}
            <Botao variante="secundario" titulo="Fechar" onPress={() => setAberta(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
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
      <Suspensa
        rotulo="Formato"
        valor={valor.formato}
        aoEscolher={(formato) => aoMudar({ ...valor, formato })}
        opcoes={FORMATOS_COMPRIMIDO.map((f) => ({
          codigo: f.codigo,
          nome: f.nome,
          desenho: <DesenhoComprimido formato={f.codigo} cor={cor?.hex ?? '#FFFFFF'} duasCores={valor.cor === 'colorido'} tamanho={30} />,
        }))}
      />
      <Suspensa
        rotulo="Cor"
        valor={valor.cor}
        aoEscolher={(c) => aoMudar({ ...valor, cor: c })}
        opcoes={CORES_COMPRIMIDO.map((c) => ({
          codigo: c.codigo,
          nome: c.nome.charAt(0).toUpperCase() + c.nome.slice(1),
          desenho: <Bolinha cor={c} />,
        }))}
      />

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
      <Botao variante="secundario" titulo="Fotografar a caixa" onPress={() => foto('camera')} />
      <Botao variante="secundario" titulo="Escolher foto da galeria" onPress={() => foto('galeria')} />
      <Erro mensagem={erro ?? null} />
    </View>
  );
}

const estilos = StyleSheet.create({
  rotulo: { fontSize: 14, fontFamily: fontes.textoNegrito, color: cores.secundario },
  campo: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderRadius: raios.pequeno,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.cartao,
  },
  seta: { fontSize: 18, color: cores.texto },
  fundo: { flex: 1, backgroundColor: 'rgba(24,24,28,0.45)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  janela: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    backgroundColor: cores.fundo,
    borderRadius: 24,
    padding: 16,
    gap: 10,
  },
  tituloJanela: { fontFamily: fontes.textoNegrito, fontSize: 18, color: cores.texto, paddingHorizontal: 4 },
  lista: { borderWidth: 1.5, borderColor: cores.borda, borderRadius: 18, overflow: 'hidden', backgroundColor: paleta.cartao },
  item: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12 },
  itemComDivisor: { borderTopWidth: 1, borderTopColor: cores.borda },
  itemMarcado: { backgroundColor: paleta.salvia.fundoClaro },
  desenhoItem: { width: 32, alignItems: 'center', justifyContent: 'center' },
  textoItem: { flex: 1, fontFamily: fontes.textoNegrito, fontSize: 16, color: cores.texto },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: cores.suave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioMarcado: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  bolinha: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#1C2321', overflow: 'hidden' },
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

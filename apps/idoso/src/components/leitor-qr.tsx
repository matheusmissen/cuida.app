import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tema } from '@/lib/tema';

/** Lê o QR code do app da família e devolve os 6 números. */
export function LeitorQr({ onCodigo, onFechar }: { onCodigo: (codigo: string) => void; onFechar: () => void }) {
  const [permissao, pedirPermissao] = useCameraPermissions();
  const lido = useRef(false);

  if (!permissao?.granted) {
    return (
      <View style={estilos.caixa}>
        <Text style={estilos.texto}>Preciso usar a câmera para ler o código.</Text>
        <Pressable style={estilos.botao} onPress={pedirPermissao} accessibilityRole="button">
          <Text style={estilos.textoBotao}>Usar a câmera</Text>
        </Pressable>
        <Pressable style={estilos.voltar} onPress={onFechar} accessibilityRole="button">
          <Text style={estilos.textoVoltar}>Digitar os números</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={estilos.caixa}>
      <CameraView
        style={estilos.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => {
          const codigo = data.match(/\d{6}/)?.[0];
          if (codigo && !lido.current) {
            lido.current = true;
            onCodigo(codigo);
          }
        }}
      />
      <Pressable style={estilos.voltar} onPress={onFechar} accessibilityRole="button">
        <Text style={estilos.textoVoltar}>Digitar os números</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: { gap: 16 },
  camera: { width: '100%', aspectRatio: 1, borderRadius: 16, overflow: 'hidden' },
  texto: { fontSize: tema.letra.minima, color: tema.texto },
  botao: {
    minHeight: tema.botaoMin,
    borderRadius: 16,
    backgroundColor: tema.primaria,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotao: { fontSize: tema.letra.media, color: '#fff', fontWeight: '800' },
  voltar: { minHeight: tema.botaoMin, alignItems: 'center', justifyContent: 'center' },
  textoVoltar: { fontSize: tema.letra.minima, color: tema.primaria, fontWeight: '700' },
});

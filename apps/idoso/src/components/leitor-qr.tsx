import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { BotaoPrincipal, BotaoSecundario, Texto } from '@/components/ui';
import { raios } from '@/lib/tema';

/** Lê o QR code do app da família e devolve os 6 números. */
export function LeitorQr({ onCodigo, onFechar }: { onCodigo: (codigo: string) => void; onFechar: () => void }) {
  const [permissao, pedirPermissao] = useCameraPermissions();
  const lido = useRef(false);

  if (!permissao?.granted) {
    return (
      <View style={estilos.caixa}>
        <Texto>Preciso usar a câmera para ler o código.</Texto>
        <BotaoPrincipal titulo="Usar a câmera" onPress={pedirPermissao} />
        <BotaoSecundario titulo="Digitar os números" onPress={onFechar} />
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
      <BotaoSecundario titulo="Digitar os números" onPress={onFechar} />
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: { gap: 16 },
  camera: { width: '100%', aspectRatio: 1, borderRadius: raios.cartao, overflow: 'hidden' },
});

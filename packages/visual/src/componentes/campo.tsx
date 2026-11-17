// Campo de texto em pílula: 54 px de altura, borda 1,5 px, rótulo em negrito acima.
// Com foco, a borda fica verde-petróleo e mais grossa.
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { alturas, bordas, cores, fontes, raios, tamanhos, type App } from '../tema.ts';

export interface CampoProps extends Omit<TextInputProps, 'style'> {
  rotulo: string;
  app?: App;
  /** Mensagem de erro mostrada abaixo do campo (em texto, nunca só pela cor). */
  erro?: string;
}

export function Campo({ rotulo, app = 'familia', erro, onFocus, onBlur, ...props }: CampoProps) {
  const [foco, setFoco] = useState(false);
  const t = tamanhos[app];
  return (
    <View style={estilos.grupo}>
      <Text style={[estilos.rotulo, { fontSize: t.rotulo }]}>{rotulo}</Text>
      <TextInput
        accessibilityLabel={rotulo}
        placeholderTextColor={cores.textoSuave}
        onFocus={(e) => {
          setFoco(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFoco(false);
          onBlur?.(e);
        }}
        style={[
          estilos.campo,
          { fontSize: t.campo },
          foco && { borderColor: cores.primaria, borderWidth: bordas.destaque },
          !!erro && { borderColor: cores.alertaForte, borderWidth: bordas.destaque },
        ]}
        {...props}
      />
      {erro ? <Text style={[estilos.erro, { fontSize: t.minimo + 1 }]}>{erro}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: 6 },
  rotulo: { fontFamily: fontes.textoNegrito, color: cores.texto },
  campo: {
    minHeight: alturas.campo,
    borderRadius: raios.campo,
    borderWidth: bordas.campo,
    borderColor: cores.bordaCampo,
    backgroundColor: cores.superficie,
    paddingHorizontal: 22,
    fontFamily: fontes.texto,
    color: cores.texto,
  },
  erro: { fontFamily: fontes.textoNegrito, color: cores.alertaTexto, paddingHorizontal: 8 },
});

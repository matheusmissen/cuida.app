// Foto da caixa do remédio: bucket privado `remedios`, caminho <paciente_id>/caixa-<aleatório>.<ext>.
// Só o responsável envia (regra no banco); o celular do idoso e a família leem por link temporário.
import { caminhoDaFotoRemedio, mimeDoArquivo } from '@cuida/cliente';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import type { ArquivoEscolhido } from './documentos';
import { supabase } from './supabase';

const MIMES_FOTO = ['image/jpeg', 'image/png', 'image/webp'];

/** Foto da galeria (a câmera vem de tirarFoto, em documentos.ts). */
export async function escolherFotoDaGaleria(): Promise<ArquivoEscolhido | null> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, exif: false });
  if (r.canceled || !r.assets[0]) return null;
  const a = r.assets[0];
  return { uri: a.uri, nome: a.fileName ?? 'caixa.jpg', mime: a.mimeType ?? 'image/jpeg', tamanho: a.fileSize ?? null, file: a.file };
}

/** Envia a foto e devolve o caminho para gravar em remedios.foto_url. */
export async function enviarFotoRemedio(pacienteId: string, arquivo: ArquivoEscolhido): Promise<{ caminho: string } | { erro: string }> {
  const mime = mimeDoArquivo(arquivo.nome, arquivo.mime);
  if (!mime || !MIMES_FOTO.includes(mime)) return { erro: 'Envie uma foto JPG ou PNG da caixa.' };
  if (arquivo.tamanho && arquivo.tamanho > 5 * 1024 * 1024) return { erro: 'Foto maior que 5 MB. Tire com menos zoom.' };
  const aleatorio = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  const caminho = caminhoDaFotoRemedio(pacienteId, mime, aleatorio);
  let corpo: Blob | ArrayBuffer;
  try {
    corpo = arquivo.file ?? (await (await fetch(arquivo.uri)).arrayBuffer());
  } catch {
    return { erro: 'Não consegui abrir a foto. Tente de novo.' };
  }
  const { error } = await supabase.storage.from('remedios').upload(caminho, corpo, { contentType: mime, upsert: false });
  if (error) {
    console.warn('remedios: foto', error.message);
    return { erro: 'Não foi possível enviar a foto. Só o responsável pode trocar a foto.' };
  }
  return { caminho };
}

export async function apagarFotoRemedio(caminho: string | null | undefined): Promise<void> {
  if (caminho && !/^https?:\/\//.test(caminho)) await supabase.storage.from('remedios').remove([caminho]);
}

/** Link temporário para mostrar a foto. */
export function useFotoRemedio(caminho: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(null);
    if (!caminho) return;
    if (/^https?:\/\//.test(caminho)) return setUrl(caminho);
    let ativo = true;
    supabase.storage
      .from('remedios')
      .createSignedUrl(caminho, 3600)
      .then(({ data }) => ativo && setUrl(data?.signedUrl ?? null));
    return () => {
      ativo = false;
    };
  }, [caminho]);
  return url;
}

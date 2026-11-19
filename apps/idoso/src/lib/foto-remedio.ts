// Foto da caixa do remédio: fica no bucket privado `remedios`; o app pede um link temporário para mostrar.
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export function useFotoRemedio(caminho: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(null);
    if (!caminho) return;
    if (/^https?:\/\//.test(caminho)) return setUrl(caminho); // foto antiga, já com endereço
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

// Documentos no Supabase: Storage (bucket privado "documentos", caminho <paciente_id>/<arquivo>),
// tabela documentos e Edge Function ler-receita. A lógica pura fica em @cuida/cliente.
import {
  caminhoDoArquivo,
  MIMES_LEITURA,
  mimeDoArquivo,
  TAMANHO_MAXIMO_LEITURA,
  type TipoDocumento,
} from '@cuida/cliente';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Linking, Platform } from 'react-native';
import { supabase } from './supabase';

export interface ArquivoEscolhido {
  uri: string;
  nome: string | null;
  mime: string | null;
  tamanho: number | null;
  /** Na web, o próprio arquivo do navegador. */
  file?: Blob;
}

/** Câmera (no celular) ou câmera/arquivo do navegador (na web). */
export async function tirarFoto(): Promise<ArquivoEscolhido | { erro: string } | null> {
  if (Platform.OS !== 'web') {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) return { erro: 'Permita o uso da câmera para fotografar o documento.' };
  }
  const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6, exif: false });
  if (r.canceled || !r.assets[0]) return null;
  const a = r.assets[0];
  return { uri: a.uri, nome: a.fileName ?? 'foto.jpg', mime: a.mimeType ?? 'image/jpeg', tamanho: a.fileSize ?? null, file: a.file };
}

/** Foto da galeria ou PDF. */
export async function escolherArquivo(): Promise<ArquivoEscolhido | null> {
  const r = await DocumentPicker.getDocumentAsync({
    type: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (r.canceled || !r.assets[0]) return null;
  const a = r.assets[0];
  return { uri: a.uri, nome: a.name, mime: a.mimeType ?? null, tamanho: a.size ?? null, file: a.file };
}

/** Confere o arquivo antes de enviar. Receitas precisam de um formato que a ler-receita lê. */
export function validarArquivo(tipo: TipoDocumento, arquivo: ArquivoEscolhido): string | null {
  const mime = mimeDoArquivo(arquivo.nome, arquivo.mime);
  if (!mime) return 'Formato não aceito. Envie uma foto (JPG ou PNG) ou um PDF.';
  if (tipo === 'receita') {
    if (!MIMES_LEITURA.includes(mime)) return 'A Lia lê fotos JPG, PNG ou WEBP e PDF. Tire a foto pelo app ou envie um PDF.';
    if (arquivo.tamanho && arquivo.tamanho > TAMANHO_MAXIMO_LEITURA) {
      return 'Arquivo maior que 5 MB. Tire a foto com menos zoom ou envie um PDF menor.';
    }
  }
  return null;
}

/** Envia o arquivo ao Storage e cria a linha em documentos. Se a linha falhar, apaga o arquivo. */
export async function enviarDocumento(p: {
  pacienteId: string;
  tipo: TipoDocumento;
  titulo: string;
  arquivo: ArquivoEscolhido;
}): Promise<{ id: string } | { erro: string }> {
  const mime = mimeDoArquivo(p.arquivo.nome, p.arquivo.mime);
  if (!mime) return { erro: 'Formato não aceito. Envie uma foto (JPG ou PNG) ou um PDF.' };
  const aleatorio = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  const caminho = caminhoDoArquivo(p.pacienteId, mime, new Date(), aleatorio);

  let corpo: Blob | ArrayBuffer;
  try {
    corpo = p.arquivo.file ?? (await (await fetch(p.arquivo.uri)).arrayBuffer());
  } catch {
    return { erro: 'Não consegui abrir o arquivo. Tente escolher de novo.' };
  }

  const { error: erroEnvio } = await supabase.storage
    .from('documentos')
    .upload(caminho, corpo, { contentType: mime, upsert: false });
  if (erroEnvio) {
    console.warn('documentos: envio', erroEnvio.message);
    return { erro: 'Não foi possível enviar o arquivo. Verifique a internet e tente de novo.' };
  }

  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const { data, error } = await supabase
    .from('documentos')
    .insert({
      paciente_id: p.pacienteId,
      tipo: p.tipo,
      titulo: p.titulo,
      data_documento: hoje,
      arquivo_path: caminho,
      mime,
      // Exames e relatórios só são guardados; receitas esperam a leitura da Lia.
      status: p.tipo === 'receita' ? 'enviado' : 'conferida',
    })
    .select('id')
    .single();
  if (error || !data) {
    console.warn('documentos: linha', error?.message);
    await supabase.storage.from('documentos').remove([caminho]);
    return { erro: 'Não foi possível salvar o documento. Tente de novo.' };
  }
  return { id: data.id };
}

/** Pede à Lia (Edge Function ler-receita) para ler a receita. Nunca cria alarmes. */
export async function lerReceita(documentoId: string): Promise<{ erro: string | null }> {
  const { error } = await supabase.functions.invoke('ler-receita', { body: { documento_id: documentoId } });
  if (!error) return { erro: null };
  let mensagem = 'Não foi possível ler a receita agora. Tente de novo ou cadastre os remédios à mão.';
  try {
    const corpo = await (error as { context?: Response }).context?.json();
    if (corpo?.erro) mensagem = String(corpo.erro).charAt(0).toUpperCase() + String(corpo.erro).slice(1) + '.';
  } catch {
    // resposta sem JSON: fica a mensagem padrão
  }
  return { erro: mensagem };
}

/** Link temporário (10 min) para ver o arquivo. O bucket é privado. */
export async function linkDoArquivo(caminho: string): Promise<string | null> {
  const { data } = await supabase.storage.from('documentos').createSignedUrl(caminho, 600);
  return data?.signedUrl ?? null;
}

export async function abrirArquivo(caminho: string): Promise<boolean> {
  const url = await linkDoArquivo(caminho);
  if (!url) return false;
  if (Platform.OS === 'web') window.open(url, '_blank', 'noopener');
  else await Linking.openURL(url);
  return true;
}

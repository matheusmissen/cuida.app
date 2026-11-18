// Web Push (notificações no navegador, inclusive no iPhone com o app instalado).
// Implementado só com WebCrypto, que é igual no Supabase (Deno) e no Node (testes):
// - RFC 8291 (cifra da mensagem, "aes128gcm"), com o formato de RFC 8188;
// - RFC 8292 (VAPID: o servidor se identifica com um JWT ES256).
// As chaves VAPID ficam só nos segredos do Supabase (VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY);
// a pública também vai nos apps, para o navegador aceitar as mensagens deste servidor.

const te = new TextEncoder();

/** Bytes num ArrayBuffer comum (o tipo que o WebCrypto aceita). */
type Bytes = Uint8Array<ArrayBuffer>;

export function base64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function deBase64url(texto: string): Bytes {
  const b64 = texto.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(texto.length / 4) * 4, '=');
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

function juntar(...partes: Uint8Array[]): Bytes {
  const total = new Uint8Array(partes.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of partes) {
    total.set(p, i);
    i += p.length;
  }
  return total;
}

async function hmac(chave: Bytes, dados: Bytes): Promise<Bytes> {
  const k = await crypto.subtle.importKey('raw', chave, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, dados));
}

/** HKDF de um bloco só (até 32 bytes), como na RFC 8291. */
async function hkdf(sal: Bytes, ikm: Bytes, info: Bytes, tamanho: number): Promise<Bytes> {
  const prk = await hmac(sal, ikm);
  return (await hmac(prk, juntar(info, new Uint8Array([1])))).slice(0, tamanho);
}

/** Inscrição que o navegador devolve em pushManager.subscribe() (guardada em inscricoes_push). */
export interface Inscricao {
  endpoint: string;
  /** Chave pública do navegador (P-256, 65 bytes, base64url). */
  p256dh: string;
  /** Segredo de autenticação do navegador (16 bytes, base64url). */
  auth: string;
}

export interface ChavesVapid {
  /** Pública (P-256 sem compressão, 65 bytes, base64url). */
  publica: string;
  /** Privada (o "d" da chave, 32 bytes, base64url). */
  privada: string;
  /** Contato do servidor para os serviços de push (mailto: ou https:). */
  assunto: string;
}

/**
 * Cifra a mensagem para um navegador (RFC 8291, aes128gcm). Devolve o corpo pronto para enviar.
 * `parSalTeste` só existe para os testes: em produção, sal e chave temporária são sempre novos.
 */
export async function cifrar(
  mensagem: Bytes,
  inscricao: Pick<Inscricao, 'p256dh' | 'auth'>,
  parSalTeste?: { sal: Bytes; chaves: CryptoKeyPair },
): Promise<Bytes> {
  const chaveDoNavegador = deBase64url(inscricao.p256dh);
  const segredo = deBase64url(inscricao.auth);
  const sal = parSalTeste?.sal ?? crypto.getRandomValues(new Uint8Array(16));
  const temporario =
    parSalTeste?.chaves ??
    ((await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair);
  const publicaTemporaria = new Uint8Array(await crypto.subtle.exportKey('raw', temporario.publicKey));

  const navegador = await crypto.subtle.importKey('raw', chaveDoNavegador, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const compartilhado = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: navegador }, temporario.privateKey, 256),
  );

  // RFC 8291 §3.4: mistura o segredo do navegador e as duas chaves públicas.
  const ikm = await hkdf(segredo, compartilhado, juntar(te.encode('WebPush: info\0'), chaveDoNavegador, publicaTemporaria), 32);
  const cek = await hkdf(sal, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(sal, ikm, te.encode('Content-Encoding: nonce\0'), 12);

  // Um registro só: mensagem + delimitador 0x02 (último registro).
  const chaveAes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cifrado = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, chaveAes, juntar(mensagem, new Uint8Array([2]))),
  );

  // Cabeçalho RFC 8188: sal (16) | tamanho do registro (4) | tamanho da chave (1) | chave temporária.
  const tamanhoRegistro = new Uint8Array(4);
  new DataView(tamanhoRegistro.buffer).setUint32(0, 4096);
  return juntar(sal, tamanhoRegistro, new Uint8Array([publicaTemporaria.length]), publicaTemporaria, cifrado);
}

/** Importa a chave privada VAPID (a pública traz o x e o y; a privada, o d). */
async function chavePrivadaVapid(chaves: ChavesVapid): Promise<CryptoKey> {
  const publica = deBase64url(chaves.publica);
  return crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: base64url(publica.slice(1, 33)),
      y: base64url(publica.slice(33, 65)),
      d: chaves.privada,
      ext: true,
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
}

/** Cabeçalho Authorization VAPID (RFC 8292) para o serviço de push do endpoint. Vale 12 horas. */
export async function cabecalhoVapid(endpoint: string, chaves: ChavesVapid, agora = new Date()): Promise<string> {
  const cabecalho = base64url(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const corpo = base64url(
    te.encode(
      JSON.stringify({
        aud: new URL(endpoint).origin,
        exp: Math.floor(agora.getTime() / 1000) + 12 * 3600,
        sub: chaves.assunto,
      }),
    ),
  );
  const assinatura = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await chavePrivadaVapid(chaves), te.encode(`${cabecalho}.${corpo}`)),
  );
  return `vapid t=${cabecalho}.${corpo}.${base64url(assinatura)}, k=${chaves.publica}`;
}

/** O que aparece na notificação (lido pelo service worker, public/sw.js). */
export interface Notificacao {
  titulo: string;
  corpo: string;
  /** Página aberta ao tocar na notificação. */
  url: string;
  /** Notificações com a mesma etiqueta se substituem (por exemplo, a mesma dose). */
  etiqueta?: string;
  /** Alerta crítico ou emergência: fica na tela até a pessoa tocar. */
  urgente?: boolean;
}

export type ResultadoEnvio = 'enviada' | 'expirada' | 'falhou';

/**
 * Envia uma notificação para um navegador.
 * 'expirada' (404/410) = a inscrição não vale mais: apague de inscricoes_push.
 */
export async function enviarWebPush(
  inscricao: Inscricao,
  notificacao: Notificacao,
  chaves: ChavesVapid,
  fetchFn: typeof fetch = fetch,
): Promise<ResultadoEnvio> {
  try {
    const corpo = await cifrar(te.encode(JSON.stringify(notificacao)), inscricao);
    const resposta = await fetchFn(inscricao.endpoint, {
      method: 'POST',
      headers: {
        Authorization: await cabecalhoVapid(inscricao.endpoint, chaves),
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: notificacao.urgente ? '3600' : '1800',
        Urgency: notificacao.urgente ? 'high' : 'normal',
      },
      body: corpo,
    });
    if (resposta.status === 404 || resposta.status === 410) return 'expirada';
    if (!resposta.ok) {
      console.error('web push: resposta', resposta.status);
      return 'falhou';
    }
    return 'enviada';
  } catch (erro) {
    console.error('web push: falha', erro instanceof Error ? erro.message : erro);
    return 'falhou';
  }
}

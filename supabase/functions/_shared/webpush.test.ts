import { test } from 'node:test';
import assert from 'node:assert/strict';
import { base64url, cabecalhoVapid, cifrar, deBase64url, enviarWebPush, type ChavesVapid } from './webpush.ts';

const te = new TextEncoder();
const td = new TextDecoder();

// Exemplo oficial da RFC 8291, apêndice A.
const RFC = {
  mensagem: 'When I grow up, I want to be a watermelon',
  remetentePrivada: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  remetentePublica: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
  navegadorPrivada: 'q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94',
  navegadorPublica: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  sal: 'DGv6ra1nlYgDCS1FRnbzlw',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  corpo:
    'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
};

/** Importa um par P-256 a partir da pública (65 bytes) e do "d". */
async function parDeChaves(publica: string, privada: string, uso: 'ECDH' | 'ECDSA'): Promise<CryptoKeyPair> {
  const p = deBase64url(publica);
  const jwk = { kty: 'EC', crv: 'P-256', x: base64url(p.slice(1, 33)), y: base64url(p.slice(33, 65)), ext: true };
  const alg = { name: uso, namedCurve: 'P-256' };
  const usosPriv: KeyUsage[] = uso === 'ECDH' ? ['deriveBits'] : ['sign'];
  const usosPub: KeyUsage[] = uso === 'ECDH' ? [] : ['verify'];
  return {
    privateKey: await crypto.subtle.importKey('jwk', { ...jwk, d: privada }, alg, true, usosPriv),
    publicKey: await crypto.subtle.importKey('jwk', jwk, alg, true, usosPub),
  };
}

/** Decifra como o navegador (RFC 8291), para conferir a ida e volta. */
async function decifrar(corpo: Uint8Array, navegador: CryptoKeyPair, auth: Uint8Array): Promise<string> {
  const sal = corpo.slice(0, 16);
  const tamChave = corpo[20];
  const publicaRemetente = corpo.slice(21, 21 + tamChave);
  const cifrado = corpo.slice(21 + tamChave);
  const remetente = await crypto.subtle.importKey('raw', publicaRemetente, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const comp = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: remetente }, navegador.privateKey, 256));
  const publicaNavegador = new Uint8Array(await crypto.subtle.exportKey('raw', navegador.publicKey));
  const hmac = async (k: Uint8Array, d: Uint8Array) =>
    new Uint8Array(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', k, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), d));
  const hkdf = async (s: Uint8Array, ikm: Uint8Array, info: Uint8Array, n: number) =>
    (await hmac(await hmac(s, ikm), new Uint8Array([...info, 1]))).slice(0, n);
  const ikm = await hkdf(auth, comp, new Uint8Array([...te.encode('WebPush: info\0'), ...publicaNavegador, ...publicaRemetente]), 32);
  const cek = await hkdf(sal, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(sal, ikm, te.encode('Content-Encoding: nonce\0'), 12);
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const claro = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, aes, cifrado));
  assert.equal(claro[claro.length - 1], 2, 'delimitador de último registro');
  return td.decode(claro.slice(0, -1));
}

test('cifra exatamente como o exemplo oficial da RFC 8291', async () => {
  const remetente = await parDeChaves(RFC.remetentePublica, RFC.remetentePrivada, 'ECDH');
  const corpo = await cifrar(te.encode(RFC.mensagem), { p256dh: RFC.navegadorPublica, auth: RFC.auth }, {
    sal: deBase64url(RFC.sal),
    chaves: remetente,
  });
  assert.equal(base64url(corpo), RFC.corpo);
});

test('ida e volta: o navegador decifra a notificação (sal e chave novos a cada envio)', async () => {
  const navegador = await parDeChaves(RFC.navegadorPublica, RFC.navegadorPrivada, 'ECDH');
  const msg = JSON.stringify({ titulo: 'Cuida · Dona Maria', corpo: 'Hora do remédio: Remédio A' });
  const a = await cifrar(te.encode(msg), { p256dh: RFC.navegadorPublica, auth: RFC.auth });
  const b = await cifrar(te.encode(msg), { p256dh: RFC.navegadorPublica, auth: RFC.auth });
  assert.notEqual(base64url(a), base64url(b));
  assert.equal(await decifrar(a, navegador, deBase64url(RFC.auth)), msg);
});

async function chavesVapidNovas(): Promise<{ chaves: ChavesVapid; publica: CryptoKey }> {
  const par = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  const jwk = await crypto.subtle.exportKey('jwk', par.privateKey);
  const publica = new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey));
  return { chaves: { publica: base64url(publica), privada: jwk.d!, assunto: 'https://cuida-app-familia.vercel.app' }, publica: par.publicKey };
}

test('VAPID: JWT ES256 com o serviço de push como público, validade de 12 h e assinatura válida', async () => {
  const { chaves, publica } = await chavesVapidNovas();
  const agora = new Date('2026-11-20T12:00:00Z');
  const h = await cabecalhoVapid('https://fcm.googleapis.com/fcm/send/abc123', chaves, agora);
  const m = h.match(/^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/);
  assert.ok(m, h);
  const [, cab, corpo, assinatura, k] = m!;
  assert.equal(k, chaves.publica);
  assert.deepEqual(JSON.parse(td.decode(deBase64url(cab))), { typ: 'JWT', alg: 'ES256' });
  const dados = JSON.parse(td.decode(deBase64url(corpo)));
  assert.equal(dados.aud, 'https://fcm.googleapis.com');
  assert.equal(dados.exp, Date.parse('2026-11-20T12:00:00Z') / 1000 + 12 * 3600);
  assert.equal(dados.sub, 'https://cuida-app-familia.vercel.app');
  assert.equal(deBase64url(assinatura).length, 64, 'assinatura ES256 tem 64 bytes (r||s)');
  const valida = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publica,
    deBase64url(assinatura),
    te.encode(`${cab}.${corpo}`),
  );
  assert.equal(valida, true);
});

test('envio: cabeçalhos do Web Push; 410 = inscrição expirada; erro de rede não derruba', async () => {
  const { chaves } = await chavesVapidNovas();
  const inscricao = { endpoint: 'https://web.push.apple.com/QGuQyavXutnMH', p256dh: RFC.navegadorPublica, auth: RFC.auth };
  const pedidos: { url: string; init: RequestInit }[] = [];
  const responder = (status: number) => (async (url: string, init: RequestInit) => {
    pedidos.push({ url, init });
    return new Response(null, { status });
  }) as unknown as typeof fetch;

  const notif = { titulo: 'Cuida', corpo: 'Teste', url: '/', urgente: true };
  assert.equal(await enviarWebPush(inscricao, notif, chaves, responder(201)), 'enviada');
  const h = pedidos[0].init.headers as Record<string, string>;
  assert.equal(pedidos[0].url, inscricao.endpoint);
  assert.equal(h['Content-Encoding'], 'aes128gcm');
  assert.equal(h.Urgency, 'high');
  assert.match(h.Authorization, /^vapid t=.+, k=/);
  assert.ok(Number(h.TTL) > 0);

  assert.equal(await enviarWebPush(inscricao, notif, chaves, responder(410)), 'expirada');
  assert.equal(await enviarWebPush(inscricao, notif, chaves, responder(404)), 'expirada');

  const erroOriginal = console.error;
  console.error = () => {};
  try {
    assert.equal(await enviarWebPush(inscricao, notif, chaves, responder(500)), 'falhou');
    const quebrado = (async () => {
      throw new Error('sem rede');
    }) as unknown as typeof fetch;
    assert.equal(await enviarWebPush(inscricao, notif, chaves, quebrado), 'falhou');
  } finally {
    console.error = erroOriginal;
  }
});

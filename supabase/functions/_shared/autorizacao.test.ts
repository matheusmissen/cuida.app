import { test } from 'node:test';
import assert from 'node:assert/strict';
import { autorizadoComoServidor, chavesDeServidor, credenciaisRecebidas, tipoDaChave } from './autorizacao.ts';

const jwt = (role: string) =>
  `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({ role })).replace(/=+$/, '')}.assinatura`;
const SERVICE = jwt('service_role');
const ANON = jwt('anon');
const SECRETA = 'sb_secret_abc123';

const ambiente = { serviceRole: SERVICE, secretKeysJson: JSON.stringify({ default: SECRETA }) };

test('aceita a service_role antiga no Authorization', () => {
  const r = credenciaisRecebidas({ authorization: `Bearer ${SERVICE}` });
  assert.equal(autorizadoComoServidor(r, chavesDeServidor(ambiente)), true);
});

test('aceita a chave secreta nova no apikey ou no Authorization', () => {
  const chaves = chavesDeServidor(ambiente);
  assert.equal(autorizadoComoServidor(credenciaisRecebidas({ apikey: SECRETA }), chaves), true);
  assert.equal(autorizadoComoServidor(credenciaisRecebidas({ authorization: `Bearer ${SECRETA}` }), chaves), true);
});

test('recusa anon, chave errada e pedido sem credencial', () => {
  const chaves = chavesDeServidor(ambiente);
  assert.equal(autorizadoComoServidor(credenciaisRecebidas({ authorization: `Bearer ${ANON}` }), chaves), false);
  assert.equal(autorizadoComoServidor(credenciaisRecebidas({ apikey: 'sb_secret_outra' }), chaves), false);
  assert.equal(autorizadoComoServidor(credenciaisRecebidas({}), chaves), false);
});

test('sem nenhuma chave no ambiente, recusa tudo', () => {
  assert.equal(autorizadoComoServidor([SERVICE], chavesDeServidor({})), false);
});

test('JSON inválido em SUPABASE_SECRET_KEYS não derruba a função', () => {
  assert.deepEqual(chavesDeServidor({ serviceRole: SERVICE, secretKeysJson: '{quebrado' }), [SERVICE]);
});

test('o log de recusa descreve a chave sem revelá-la', () => {
  assert.equal(tipoDaChave(SERVICE), 'jwt:service_role');
  assert.equal(tipoDaChave(ANON), 'jwt:anon');
  assert.equal(tipoDaChave(SECRETA), 'sb_secret');
  assert.equal(tipoDaChave('qualquer'), 'outro');
});

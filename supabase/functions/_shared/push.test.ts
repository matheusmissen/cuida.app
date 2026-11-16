import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enviarPush, mensagensPush } from './push.ts';
import type { Cuidador } from './escala.ts';

const comToken: Cuidador = { usuarioId: 'a', papel: 'principal', ordemEscala: 1, pushToken: 'ExponentPushToken[a]' };
const semToken: Cuidador = { usuarioId: 'b', papel: 'apoio', ordemEscala: 2, pushToken: null };
const alerta = { nivel: 'vermelho' as const, gatilho: 'dose.critica_perdida', motivo: 'Não confirmou Remédio A há mais de 1 hora.' };

test('push só para quem tem token, com prioridade alta no vermelho', () => {
  const msgs = mensagensPush(alerta, 'al1', 'Dona Maria', [comToken, semToken]);
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].to, 'ExponentPushToken[a]');
  assert.equal(msgs[0].priority, 'high');
  assert.match(msgs[0].title, /Dona Maria/);
  assert.equal(msgs[0].body, alerta.motivo);
  assert.deepEqual(msgs[0].data, { alertaId: 'al1', nivel: 'vermelho' });
});

test('falha no envio de push não lança erro', async () => {
  const msgs = mensagensPush(alerta, 'al1', 'Dona Maria', [comToken]);
  const falha = (async () => {
    throw new Error('sem rede');
  }) as unknown as typeof fetch;
  const erroOriginal = console.error;
  console.error = () => {};
  try {
    assert.equal(await enviarPush(msgs, falha), 0);
  } finally {
    console.error = erroOriginal;
  }
});

test('envia em lotes de até 100', async () => {
  const destinatarios = Array.from({ length: 150 }, (_, i) => ({ ...comToken, usuarioId: `u${i}` }));
  const msgs = mensagensPush(alerta, 'al1', 'Dona Maria', destinatarios);
  const tamanhos: number[] = [];
  const fake = (async (_url: string, init: { body: string }) => {
    tamanhos.push(JSON.parse(init.body).length);
    return { ok: true, status: 200 };
  }) as unknown as typeof fetch;
  assert.equal(await enviarPush(msgs, fake), 150);
  assert.deepEqual(tamanhos, [100, 50]);
});

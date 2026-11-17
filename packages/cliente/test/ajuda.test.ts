import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mensagemDaAjuda, pedirAjuda } from '../src/ajuda.ts';

const ok = async () => ({ error: null });
const erro = async () => ({ error: new Error('fora do ar') });
const explode = async (): Promise<{ error: unknown }> => {
  throw new Error('sem internet');
};

test('Edge Function funcionando: família avisada e o banco não é chamado de novo', async () => {
  let chamouBanco = false;
  const r = await pedirAjuda({
    funcao: ok,
    banco: async () => {
      chamouBanco = true;
      return { error: null };
    },
  });
  assert.equal(r, 'avisada');
  assert.equal(chamouBanco, false);
});

test('Edge Function falhou: grava direto no banco (sem push)', async () => {
  assert.equal(await pedirAjuda({ funcao: erro, banco: ok }), 'registrada');
  assert.equal(await pedirAjuda({ funcao: explode, banco: ok }), 'registrada');
});

test('tudo falhou: avisa que não conseguiu', async () => {
  assert.equal(await pedirAjuda({ funcao: erro, banco: explode }), 'falhou');
});

test('a mensagem só diz "família avisada" quando o push saiu', () => {
  assert.match(mensagemDaAjuda('avisada').titulo, /foi avisada/);
  for (const r of ['registrada', 'falhou'] as const) {
    assert.doesNotMatch(mensagemDaAjuda(r).titulo, /avisada/);
    assert.match(mensagemDaAjuda(r).texto, /192/);
  }
});

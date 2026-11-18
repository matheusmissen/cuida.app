import { test } from 'node:test';
import assert from 'node:assert/strict';
import { perguntaDoCheckin, registrarRostinho, respostaAoRostinho } from '../src/rostinho.ts';

const ok = async () => ({ error: null });
const erro = async () => ({ error: new Error('fora do ar') });

test('grava pela Edge Function e, se ela falhar, direto no banco', async () => {
  let chamouBanco = false;
  assert.equal(await registrarRostinho({ funcao: ok, banco: async () => ((chamouBanco = true), { error: null }) }), true);
  assert.equal(chamouBanco, false);
  assert.equal(await registrarRostinho({ funcao: erro, banco: ok }), true);
  assert.equal(
    await registrarRostinho({
      funcao: async () => {
        throw new Error('sem internet');
      },
      banco: erro,
    }),
    false,
  );
});

test('níveis 1 a 3 agradecem; 4 a 6 abrem a conversa com uma pergunta', () => {
  for (const n of [1, 2, 3] as const) assert.equal(respostaAoRostinho(n, 'Maria').conversar, false);
  for (const n of [4, 5, 6] as const) {
    const r = respostaAoRostinho(n, 'Maria');
    assert.equal(r.conversar, true);
    assert.ok(r.fala.endsWith('?'), 'termina com uma pergunta');
    assert.equal((r.fala.match(/\?/g) ?? []).length, 1, 'uma pergunta por vez');
    assert.ok(!/não é nada/i.test(r.fala));
  }
  assert.match(respostaAoRostinho(6, 'Maria').fala, /família/);
});

test('a pergunta do check-in usa o apelido e pede o toque', () => {
  const frase = perguntaDoCheckin('Maria', new Date('2026-11-20T11:00:00Z'));
  assert.match(frase, /Maria/);
  assert.match(frase, /Como você está hoje\?/);
});

test('painel: a conversa com a Lia herda o rostinho do mesmo dia', async () => {
  const { checkinDoPainel } = await import('../src/rostinho.ts');
  const base = { paciente_id: 'p' } as never;
  const lia = { ...(base as object), id: 'b', feito_em: '2026-11-20T12:05:00Z', nivel: null, febre: true } as never;
  const rosto = { ...(base as object), id: 'a', feito_em: '2026-11-20T12:00:00Z', nivel: 5 } as never;
  const ontem = { ...(base as object), id: 'c', feito_em: '2026-11-19T12:00:00Z', nivel: 1 } as never;
  const r = checkinDoPainel([lia, rosto, ontem]);
  assert.equal(r?.id, 'b');
  assert.equal(r?.nivel, 5);
  assert.equal((r as unknown as { febre: boolean }).febre, true);
  // Sem rostinho no mesmo dia: não usa o de ontem.
  assert.equal(checkinDoPainel([lia, ontem])?.nivel, null);
  assert.equal(checkinDoPainel([]), null);
});

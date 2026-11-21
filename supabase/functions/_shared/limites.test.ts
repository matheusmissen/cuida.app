import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIMITE_CONVERSAS_DIA, LIMITE_DO_TIPO, LIMITE_LEITURAS_DIA, podeUsarIa, respostaDoLimite } from './limites.ts';

const banco = (resposta: { data: unknown; error: { message: string } | null }) =>
  ({ rpc: async (_nome: string, _args: unknown) => resposta }) as never;

test('limites de uso da IA por dia', () => {
  assert.equal(LIMITE_DO_TIPO.conversa, LIMITE_CONVERSAS_DIA);
  assert.equal(LIMITE_DO_TIPO.leitura, LIMITE_LEITURAS_DIA);
  assert.ok(LIMITE_CONVERSAS_DIA >= 30, 'uma conversa normal do dia cabe com folga');
});

test('dentro do limite pode usar; passou do limite não', async () => {
  assert.equal(await podeUsarIa(banco({ data: true, error: null }), 'u1', 'conversa'), true);
  assert.equal(await podeUsarIa(banco({ data: false, error: null }), 'u1', 'leitura'), false);
});

test('se o banco falhar ao contar, não bloqueia o idoso', async () => {
  assert.equal(await podeUsarIa(banco({ data: null, error: { message: 'fora do ar' } }), 'u1', 'conversa'), true);
});

test('a frase do limite é carinhosa e lembra do botão de ajuda', () => {
  const f = respostaDoLimite('Dona Maria');
  assert.match(f, /^Dona Maria, hoje já conversamos bastante/);
  assert.match(f, /Preciso de ajuda/);
  assert.doesNotMatch(f, /não é nada|senha|remédio/i);
});

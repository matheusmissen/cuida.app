import { test } from 'node:test';
import assert from 'node:assert/strict';
import { precisaAceitarTermos, TERMOS_FAMILIA, VERSAO_TERMOS } from '../src/termos.ts';

test('versão no formato que o banco aceita (AAAA-MM-DD)', () => {
  assert.match(VERSAO_TERMOS, /^\d{4}-\d{2}-\d{2}$/);
});

test('os termos cobrem o que o PRD pede: dados de contato e sigilo sobre o idoso', () => {
  const tudo = TERMOS_FAMILIA.map((s) => `${s.titulo} ${s.texto}`).join(' ');
  assert.match(tudo, /e-mail/);
  assert.match(tudo, /telefone/);
  assert.match(tudo, /confidenciais/);
  assert.match(tudo, /192/);
  assert.match(tudo, /sair do grupo/);
});

test('pede de novo quando a versão muda', () => {
  assert.equal(precisaAceitarTermos([]), true);
  assert.equal(precisaAceitarTermos(['2020-01-01']), true);
  assert.equal(precisaAceitarTermos([VERSAO_TERMOS]), false);
});

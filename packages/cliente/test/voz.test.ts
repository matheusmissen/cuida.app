import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ehPortuguesDoBrasil, escolherVozDaLia, type VozDisponivel } from '../src/voz.ts';

const voz = (name: string, language: string): VozDisponivel => ({ identifier: name, name, language });

test('voz da Lia: nunca usa a voz de Portugal', () => {
  assert.equal(escolherVozDaLia([voz('Joana', 'pt-PT'), voz('Catarina', 'pt-PT')]), null);
  assert.equal(escolherVozDaLia([voz('Joana', 'pt-PT'), voz('Luciana', 'pt-BR')]), 'Luciana');
  assert.equal(escolherVozDaLia([]), null);
});

test('voz da Lia: prefere a voz natural feminina do Brasil', () => {
  // Edge no Windows
  assert.equal(
    escolherVozDaLia([
      voz('Microsoft Daniel - Portuguese (Brazil)', 'pt-BR'),
      voz('Microsoft Maria - Portuguese (Brazil)', 'pt-BR'),
      voz('Microsoft Antonio Online (Natural) - Portuguese (Brazil)', 'pt-BR'),
      voz('Microsoft Francisca Online (Natural) - Portuguese (Brazil)', 'pt-BR'),
      voz('Microsoft Raquel Online (Natural) - Portuguese (Portugal)', 'pt-PT'),
    ]),
    'Microsoft Francisca Online (Natural) - Portuguese (Brazil)',
  );
  // Chrome
  assert.equal(
    escolherVozDaLia([voz('Google português de Portugal', 'pt-PT'), voz('Google português do Brasil', 'pt-BR')]),
    'Google português do Brasil',
  );
  // iPhone e Mac
  assert.equal(escolherVozDaLia([voz('Felipe', 'pt-BR'), voz('Luciana', 'pt-BR'), voz('Joana', 'pt-PT')]), 'Luciana');
});

test('voz da Lia: só masculina do Brasil ainda é melhor que nenhuma', () => {
  assert.equal(escolherVozDaLia([voz('Felipe', 'pt-BR'), voz('Joana', 'pt-PT')]), 'Felipe');
});

test('reconhece português do Brasil com hífen ou sublinhado', () => {
  assert.equal(ehPortuguesDoBrasil('pt-BR'), true);
  assert.equal(ehPortuguesDoBrasil('pt_BR'), true);
  assert.equal(ehPortuguesDoBrasil('PT-br'), true);
  assert.equal(ehPortuguesDoBrasil('pt-PT'), false);
  assert.equal(ehPortuguesDoBrasil('pt'), false);
});

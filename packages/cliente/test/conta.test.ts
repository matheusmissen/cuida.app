import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apagaDadosDeAlguem, confirmacaoValida, oQueAcontece } from '../src/conta.ts';

test('apagar conta: a confirmação é a palavra APAGAR, sem diferença de maiúsculas', () => {
  assert.equal(confirmacaoValida('APAGAR'), true);
  assert.equal(confirmacaoValida('  apagar '), true);
  assert.equal(confirmacaoValida('apaga'), false);
  assert.equal(confirmacaoValida(''), false);
});

test('apagar conta: explica o que acontece em cada grupo', () => {
  const grupos = [
    { paciente_id: 'p1', nome: 'Dona Maria', papel: 'principal', sozinho: false },
    { paciente_id: 'p2', nome: 'Seu José', papel: 'principal', sozinho: true },
    { paciente_id: 'p3', nome: 'Dona Rosa', papel: 'apoio', sozinho: false },
  ];
  const frases = oQueAcontece(grupos);
  assert.match(frases[0], /próxima pessoa do grupo vira responsável/);
  assert.match(frases[1], /única pessoa no grupo de Seu José: os dados de Seu José serão apagados/);
  assert.match(frases[2], /O grupo continua cuidando de Dona Rosa/);
  assert.equal(apagaDadosDeAlguem(grupos), true);
  assert.equal(apagaDadosDeAlguem([grupos[0]]), false);
  assert.deepEqual(oQueAcontece([]), []);
});

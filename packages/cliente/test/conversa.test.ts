import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  adicionarFala,
  corpoDoAgente,
  criarAcumuladorDeFala,
  lerRespostaDoAgente,
  MAX_HISTORICO,
  mensagemErroEscuta,
  type Fala,
} from '../src/conversa.ts';

test('histórico guarda só as últimas 12 falas e ignora falas vazias', () => {
  let h: Fala[] = [];
  for (let i = 0; i < 15; i++) h = adicionarFala(h, { papel: i % 2 ? 'lia' : 'idoso', texto: `fala ${i}` });
  assert.equal(h.length, MAX_HISTORICO);
  assert.equal(h[0].texto, 'fala 3');
  assert.equal(adicionarFala(h, { papel: 'idoso', texto: '   ' }), h);
});

test('corpo do agente segue o contrato: texto novo separado do histórico', () => {
  const historico: Fala[] = [
    { papel: 'lia', texto: 'Bom dia! Como a senhora dormiu?' },
    { papel: 'idoso', texto: 'Dormi bem.' },
  ];
  assert.deepEqual(corpoDoAgente('  tô quentinha  ', historico), { texto: 'tô quentinha', historico });
});

test('lê a resposta do agente com alertas', () => {
  const r = lerRespostaDoAgente({
    resposta: 'Já avisei a sua família, tá bom?',
    alertas: [{ nivel: 'vermelho', motivo: 'Febre ou calafrio.' }, { lixo: true }],
  });
  assert.deepEqual(r, {
    resposta: 'Já avisei a sua família, tá bom?',
    alertas: [{ nivel: 'vermelho', motivo: 'Febre ou calafrio.' }],
  });
});

test('resposta fora do contrato vira null (o app fala a frase de erro)', () => {
  assert.equal(lerRespostaDoAgente(null), null);
  assert.equal(lerRespostaDoAgente({ erro: 'não autorizado' }), null);
  assert.equal(lerRespostaDoAgente({ resposta: '   ' }), null);
  assert.deepEqual(lerRespostaDoAgente({ resposta: 'Oi' }), { resposta: 'Oi', alertas: [] });
});

test('acumulador junta resultados finais e entrega uma vez no fim', () => {
  const a = criarAcumuladorDeFala();
  assert.equal(a.resultado('tô', false), 'tô');
  assert.equal(a.resultado('tô quentinha', true), 'tô quentinha');
  assert.equal(a.resultado('e meio', false), 'tô quentinha e meio');
  assert.equal(a.resultado('e meio caída', true), 'tô quentinha e meio caída');
  assert.equal(a.fim(), 'tô quentinha e meio caída');
  assert.equal(a.fim(), null);
});

test('acumulador usa o parcial se a escuta parar sem resultado final', () => {
  const a = criarAcumuladorDeFala();
  a.resultado('tomei o remédio', false);
  assert.equal(a.fim(), 'tomei o remédio');
});

test('acumulador não entrega nada depois de erro ou sem fala', () => {
  const a = criarAcumuladorDeFala();
  a.resultado('socorro', false);
  a.erro();
  assert.equal(a.fim(), null);
  assert.equal(criarAcumuladorDeFala().fim(), null);
});

test('erros do reconhecimento viram frases simples; cancelar fica em silêncio', () => {
  assert.equal(mensagemErroEscuta('aborted'), null);
  assert.match(mensagemErroEscuta('not-allowed')!, /microfone/);
  assert.match(mensagemErroEscuta('no-speech')!, /Não ouvi/);
  assert.match(mensagemErroEscuta('network')!, /internet/);
  assert.ok(mensagemErroEscuta('qualquer-outro'));
});

import { ehPedidoDeAjuda, familiaFoiAvisada } from '../src/conversa.ts';

test('família avisada: vermelho ou laranja; amarelo e informativo não', () => {
  assert.equal(familiaFoiAvisada([{ nivel: 'vermelho', motivo: 'Febre ou calafrio.' }]), true);
  assert.equal(familiaFoiAvisada([{ nivel: 'laranja', motivo: 'Manchas roxas novas.' }]), true);
  assert.equal(familiaFoiAvisada([{ nivel: 'amarelo', motivo: 'Humor baixo há 3 dias.' }]), false);
  assert.equal(familiaFoiAvisada([]), false);
});

test('pedido de ajuda reconhecido pelo motivo do motor de regras', () => {
  assert.equal(ehPedidoDeAjuda({ nivel: 'vermelho', motivo: 'Pediu ajuda: caiu na cozinha' }), true);
  assert.equal(ehPedidoDeAjuda({ nivel: 'vermelho', motivo: 'Apertou o botão "Preciso de ajuda".' }), true);
  assert.equal(ehPedidoDeAjuda({ nivel: 'vermelho', motivo: 'Febre ou calafrio.' }), false);
});

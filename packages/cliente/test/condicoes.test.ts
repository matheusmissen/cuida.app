import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avaliarCheckin } from '@cuida/regras';
import {
  CONDICOES,
  CONDICOES_COM_ALERTAS,
  MAX_OUTRAS_CONDICOES,
  condicoesParaSalvar,
  descreverCondicoes,
  limparOutrasCondicoes,
  normalizarCondicoes,
} from '../src/condicoes.ts';

const febre = { feitoEm: '2026-11-20T09:00:00-03:00', febre: true };

test('o código da leucemia no catálogo liga o modelo de alertas do motor de regras', () => {
  const leucemia = CONDICOES_COM_ALERTAS.find((c) => c.codigo === 'leucemia');
  assert.ok(leucemia, 'leucemia está entre as condições com alertas');
  const alertas = avaliarCheckin(febre, [], { condicoes: normalizarCondicoes(['leucemia']) });
  assert.equal(alertas[0]?.gatilho, 'leucemia.febre');
  assert.equal(alertas[0]?.nivel, 'vermelho');
});

test('condições só de registro não geram alertas próprios', () => {
  const soRegistro = CONDICOES.filter((c) => !c.alertas).map((c) => c.codigo);
  assert.ok(soRegistro.includes('diabetes') && soRegistro.includes('hipertensao'));
  assert.deepEqual(avaliarCheckin(febre, [], { condicoes: soRegistro }), []);
});

test('o texto livre nunca liga alertas, mesmo dizendo "leucemia"', () => {
  const { condicoes, outras_condicoes } = condicoesParaSalvar({
    possui: true,
    selecionadas: [],
    outras: 'leucemia mieloide',
  });
  assert.deepEqual(condicoes, []);
  assert.equal(outras_condicoes, 'leucemia mieloide');
  assert.deepEqual(avaliarCheckin(febre, [], { condicoes }), []);
});

test('normaliza: descarta códigos desconhecidos, repetidos e segue a ordem do catálogo', () => {
  assert.deepEqual(normalizarCondicoes(['hipertensao', 'xyz', 'leucemia', 'hipertensao']), ['leucemia', 'hipertensao']);
});

test('resposta "Não" grava tudo vazio, mesmo com itens marcados antes', () => {
  assert.deepEqual(condicoesParaSalvar({ possui: false, selecionadas: ['leucemia'], outras: 'artrose' }), {
    condicoes: [],
    outras_condicoes: null,
  });
});

test('limpa o texto livre: espaços, vazio e limite de tamanho', () => {
  assert.equal(limparOutrasCondicoes('  artrose   no joelho '), 'artrose no joelho');
  assert.equal(limparOutrasCondicoes('   '), null);
  assert.equal(limparOutrasCondicoes(null), null);
  assert.equal(limparOutrasCondicoes('a'.repeat(500))?.length, MAX_OUTRAS_CONDICOES);
});

test('descreve as condições com rótulos legíveis e o texto livre no fim', () => {
  assert.deepEqual(descreverCondicoes(['hipertensao', 'leucemia'], 'artrose'), [
    'Leucemia em tratamento',
    'Pressão alta',
    'artrose',
  ]);
});

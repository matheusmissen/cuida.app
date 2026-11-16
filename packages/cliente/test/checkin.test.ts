import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fraseDoCheckin, instantesDoCheckin } from '../src/checkin.ts';

const em = (hora: string, dia = '2026-11-20') => new Date(`${dia}T${hora}:00-03:00`);

test('frases do check-in: chamada e segunda tentativa', () => {
  assert.equal(
    fraseDoCheckin('Dona Maria', 1, em('09:00')),
    'Bom dia, Dona Maria! Vamos conversar um pouquinho? Como está se sentindo hoje?',
  );
  assert.match(fraseDoCheckin('Dona Maria', 2, em('09:30')), /ainda não conversamos hoje/);
});

test('notificações do check-in: hoje e amanhã, só no futuro', () => {
  const antes = instantesDoCheckin('09:00:00', em('08:00'), false).map((d) => d.toISOString());
  assert.deepEqual(antes, [
    '2026-11-20T12:00:00.000Z',
    '2026-11-20T12:30:00.000Z',
    '2026-11-21T12:00:00.000Z',
    '2026-11-21T12:30:00.000Z',
  ]);
  assert.equal(instantesDoCheckin('09:00', em('09:10'), false).length, 3);
});

test('check-in feito hoje: só as notificações de amanhã; desligado: nenhuma', () => {
  assert.equal(instantesDoCheckin('09:00', em('08:00'), true).length, 2);
  assert.deepEqual(instantesDoCheckin(null, em('08:00'), false), []);
});

import { resumoDoCheckin } from '../src/checkin.ts';
import type { CheckinLinha } from '../src/tipos.ts';

const vazio: CheckinLinha = {
  id: 'c', paciente_id: 'p', feito_em: '2026-11-20T12:00:00Z', febre: false, temperatura: null, calafrio: null,
  sangramento: false, manchas: false, sinais_infeccao: null, cansaco: 'leve', humor: 'bom', apetite_baixo: null,
  nausea: null, queda: null, dor_no_peito: null, falta_de_ar: null, confuso: null, sono: 'dormiu bem', notas: null,
};

test('resumo do check-in: nada fora do normal', () => {
  assert.deepEqual(resumoDoCheckin(vazio), []);
});

test('resumo do check-in: "tô quentinha" registrada como febre aparece primeiro, com temperatura', () => {
  assert.deepEqual(resumoDoCheckin({ ...vazio, febre: true, temperatura: 38.2, cansaco: 'forte' }), [
    'Febre (38,2 °C)',
    'Cansaço forte',
  ]);
});

test('resumo do check-in: queda vem antes; temperatura normal aparece como informação', () => {
  assert.deepEqual(resumoDoCheckin({ ...vazio, queda: true, temperatura: 36.5 }), ['Queda', 'Temperatura (36,5 °C)']);
});

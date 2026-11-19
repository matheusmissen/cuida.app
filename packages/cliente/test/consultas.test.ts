import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  comQuem,
  consultaPerto,
  instanteDaConsulta,
  lerDataDaConsulta,
  proximaConsulta,
  quandoPorExtenso,
} from '../src/consultas.ts';

// Sexta, 20/11/2026, 10:00 em Brasília.
const agora = new Date('2026-11-20T13:00:00Z');

test('quando por extenso, no horário de Brasília', () => {
  assert.equal(quandoPorExtenso('2026-11-20T17:00:00Z', agora), 'Hoje às 14:00');
  assert.equal(quandoPorExtenso('2026-11-21T12:30:00Z', agora), 'Amanhã às 09:30');
  assert.equal(quandoPorExtenso('2026-11-28T13:00:00Z', agora), 'Sábado, 28/11, às 10:00');
  // 22h de Brasília ainda é "hoje", mesmo já sendo o dia seguinte em UTC.
  assert.equal(quandoPorExtenso('2026-11-21T01:00:00Z', agora), 'Hoje às 22:00');
});

test('próxima consulta e só as que estão perto para o idoso', () => {
  const lista = [
    { quando: '2026-12-15T13:00:00Z' },
    { quando: '2026-11-19T13:00:00Z' }, // já passou
    { quando: '2026-11-22T13:00:00Z' },
  ];
  assert.equal(proximaConsulta(lista, agora)?.quando, '2026-11-22T13:00:00Z');
  assert.equal(consultaPerto([{ quando: '2026-12-15T13:00:00Z' }], agora), null);
  // Durante a consulta (até 1 hora depois), ela ainda aparece.
  assert.equal(proximaConsulta([{ quando: '2026-11-20T12:30:00Z' }], agora)?.quando, '2026-11-20T12:30:00Z');
});

test('com quem é a consulta', () => {
  assert.equal(comQuem({ medico: 'Dra. Ana', especialidade: 'Hematologia' }), 'Dra. Ana (Hematologia)');
  assert.equal(comQuem({ medico: null, especialidade: 'Cardiologia' }), 'Cardiologia');
});

test('lê a data digitada pela família', () => {
  assert.equal(lerDataDaConsulta('28/11', agora), '2026-11-28');
  assert.equal(lerDataDaConsulta('5/1', agora), '2027-01-05'); // já passou neste ano: próximo
  assert.equal(lerDataDaConsulta('03/02/2027', agora), '2027-02-03');
  assert.equal(lerDataDaConsulta('31/02', agora), null);
  assert.equal(lerDataDaConsulta('amanhã', agora), null);
  assert.equal(instanteDaConsulta('2026-11-28', '14:30'), '2026-11-28T17:30:00.000Z');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { situacaoDoCheckin, tentativasDoCheckin } from '../src/checkin.ts';
import { TEMPOS_DEMONSTRACAO } from '../src/tempos.ts';

// Horário de Brasília (-03:00)
const em = (hora: string, dia = '2026-11-20') => new Date(`${dia}T${hora}:00-03:00`);

test('check-in: um lembrete, no horário de Brasília', () => {
  const lembretes = tentativasDoCheckin('08:00', em('07:00'));
  assert.equal(lembretes.length, 1);
  assert.equal(lembretes[0].toISOString(), '2026-11-20T11:00:00.000Z');
  assert.equal(tentativasDoCheckin('08:00:00', em('23:30'))[0].toISOString(), '2026-11-20T11:00:00.000Z');
});

test('check-in: antes do horário, ninguém é chamado', () => {
  const s = situacaoDoCheckin('08:00', em('07:59'), null);
  assert.equal(s.aguardando, false);
  assert.equal(s.tentativa, 0);
  assert.equal(s.alerta, null);
});

test('check-in: no horário o app chama; até 14 min sem resposta ainda não alerta', () => {
  const s = situacaoDoCheckin('08:00', em('08:00'), null);
  assert.equal(s.aguardando, true);
  assert.equal(s.tentativa, 1);
  assert.equal(situacaoDoCheckin('08:00', em('08:14'), null).alerta, null);
});

test('check-in sem resposta em 15 min → laranja (responsável primeiro)', () => {
  const s = situacaoDoCheckin('08:00', em('08:15'), null);
  assert.equal(s.minutosSemResposta, 15);
  assert.equal(s.alerta?.nivel, 'laranja');
  assert.equal(s.alerta?.gatilho, 'geral.checkin_sem_resposta');
  assert.equal(s.aguardando, true);
});

test('check-in: modo demonstração alerta com 1 minuto', () => {
  assert.equal(situacaoDoCheckin('08:00', em('08:00'), null, TEMPOS_DEMONSTRACAO).alerta, null);
  assert.equal(situacaoDoCheckin('08:00', em('08:01'), null, TEMPOS_DEMONSTRACAO).alerta?.nivel, 'laranja');
});

test('check-in feito hoje (mesmo antes do horário): nada a fazer', () => {
  const s = situacaoDoCheckin('08:00', em('11:00'), em('07:40').toISOString());
  assert.deepEqual(s, { feito: true, aguardando: false, tentativa: 0, minutosSemResposta: 0, alerta: null });
});

test('check-in de ontem não conta para hoje', () => {
  const s = situacaoDoCheckin('08:00', em('08:20'), em('21:00', '2026-11-19').toISOString());
  assert.equal(s.feito, false);
  assert.equal(s.alerta?.nivel, 'laranja');
});

test('check-in: dia local, não UTC (22h em Brasília já é amanhã em UTC)', () => {
  const s = situacaoDoCheckin('21:00', em('22:00'), em('20:00').toISOString());
  assert.equal(s.feito, true);
});

test('check-in: horário inválido é erro, não silêncio', () => {
  assert.throws(() => situacaoDoCheckin('25:00', em('10:00'), null), /Horário inválido/);
});

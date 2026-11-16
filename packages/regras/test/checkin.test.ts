import { test } from 'node:test';
import assert from 'node:assert/strict';
import { situacaoDoCheckin, tentativasDoCheckin } from '../src/checkin.ts';

// Horário de Brasília (-03:00)
const em = (hora: string, dia = '2026-11-20') => new Date(`${dia}T${hora}:00-03:00`);

test('check-in: duas tentativas, no horário e 30 min depois (horário de Brasília)', () => {
  const [t1, t2] = tentativasDoCheckin('09:00', em('07:00'));
  assert.equal(t1.toISOString(), '2026-11-20T12:00:00.000Z');
  assert.equal(t2.toISOString(), '2026-11-20T12:30:00.000Z');
  assert.equal(tentativasDoCheckin('09:00:00', em('23:30'))[0].toISOString(), '2026-11-20T12:00:00.000Z');
});

test('check-in: antes do horário, a Lia não chama', () => {
  const s = situacaoDoCheckin('09:00', em('08:59'), null);
  assert.equal(s.aguardando, false);
  assert.equal(s.tentativa, 0);
  assert.equal(s.alerta, null);
});

test('check-in: no horário, 1ª tentativa; aos 30 min, 2ª tentativa, ainda sem alerta', () => {
  assert.equal(situacaoDoCheckin('09:00', em('09:00'), null).tentativa, 1);
  const s = situacaoDoCheckin('09:00', em('09:30'), null);
  assert.equal(s.tentativa, 2);
  assert.equal(s.tentativasSemResposta, 1);
  assert.equal(s.alerta, null);
});

test('check-in sem resposta após 2 tentativas em 1 h → laranja', () => {
  assert.equal(situacaoDoCheckin('09:00', em('09:59'), null).alerta, null);
  const s = situacaoDoCheckin('09:00', em('10:00'), null);
  assert.equal(s.tentativasSemResposta, 2);
  assert.equal(s.alerta?.nivel, 'laranja');
  assert.equal(s.alerta?.gatilho, 'geral.checkin_sem_resposta');
  assert.equal(s.aguardando, true);
});

test('check-in feito hoje (mesmo antes do horário): nada a fazer', () => {
  const s = situacaoDoCheckin('09:00', em('11:00'), em('07:40').toISOString());
  assert.deepEqual(s, { feito: true, aguardando: false, tentativa: 0, tentativasSemResposta: 0, alerta: null });
});

test('check-in de ontem não conta para hoje', () => {
  const s = situacaoDoCheckin('09:00', em('10:05'), em('21:00', '2026-11-19').toISOString());
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

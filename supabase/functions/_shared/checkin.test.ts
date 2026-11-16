import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkinsSemResposta, type PacienteCheckin } from './checkin.ts';

const em = (hora: string, dia = '2026-11-20') => new Date(`${dia}T${hora}:00-03:00`);
const maria: PacienteCheckin = { id: 'p1', horarioCheckin: '09:00:00', ultimoCheckinEm: null };

test('check-in sem resposta 1 h depois do horário → alerta laranja', () => {
  const r = checkinsSemResposta([maria], new Map(), em('10:05'));
  assert.equal(r.length, 1);
  assert.equal(r[0].alerta.nivel, 'laranja');
  assert.equal(r[0].alerta.gatilho, 'geral.checkin_sem_resposta');
});

test('antes de 1 h depois do horário, nada', () => {
  assert.deepEqual(checkinsSemResposta([maria], new Map(), em('09:55')), []);
});

test('check-in feito hoje: sem alerta', () => {
  const r = checkinsSemResposta([{ ...maria, ultimoCheckinEm: em('09:20').toISOString() }], new Map(), em('10:30'));
  assert.deepEqual(r, []);
});

test('avisa uma vez por dia', () => {
  const avisos = new Map([['p1', em('10:00').toISOString()]]);
  assert.deepEqual(checkinsSemResposta([maria], avisos, em('15:00')), []);
  const ontem = new Map([['p1', em('10:00', '2026-11-19').toISOString()]]);
  assert.equal(checkinsSemResposta([maria], ontem, em('10:05')).length, 1);
});

test('check-in desligado (null) ou horário inválido: ignora sem derrubar os outros', () => {
  const erroOriginal = console.error;
  console.error = () => {};
  try {
    const r = checkinsSemResposta(
      [{ ...maria, id: 'desligado', horarioCheckin: null }, { ...maria, id: 'ruim', horarioCheckin: '99:00' }, maria],
      new Map(),
      em('10:05'),
    );
    assert.deepEqual(r.map((x) => x.pacienteId), ['p1']);
  } finally {
    console.error = erroOriginal;
  }
});

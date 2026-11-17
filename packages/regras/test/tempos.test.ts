import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emModoDemonstracao, TEMPOS_DEMONSTRACAO, TEMPOS_PADRAO, temposDoPaciente } from '../src/tempos.ts';

test('tempos padrão do PRD: dose 30, check-in 15, escalada 15', () => {
  assert.deepEqual(TEMPOS_PADRAO, { toleranciaDoseMin: 30, toleranciaCheckinMin: 15, escaladaMin: 15 });
  assert.deepEqual(temposDoPaciente(null), TEMPOS_PADRAO);
  assert.deepEqual(temposDoPaciente({}), TEMPOS_PADRAO);
});

test('lê as colunas de pacientes', () => {
  assert.deepEqual(
    temposDoPaciente({ tolerancia_dose_min: 1, tolerancia_checkin_min: 1, escalada_min: 1 }),
    TEMPOS_DEMONSTRACAO,
  );
  assert.equal(temposDoPaciente({ tolerancia_dose_min: '20' }).toleranciaDoseMin, 20);
});

test('valor inválido usa o padrão; fora dos limites é ajustado (nunca zero)', () => {
  assert.equal(temposDoPaciente({ tolerancia_dose_min: 'abc' }).toleranciaDoseMin, 30);
  assert.equal(temposDoPaciente({ escalada_min: 0 }).escaladaMin, 1);
  assert.equal(temposDoPaciente({ escalada_min: -5 }).escaladaMin, 1);
  assert.equal(temposDoPaciente({ tolerancia_checkin_min: 9999 }).toleranciaCheckinMin, 240);
});

test('modo demonstração = tudo em 1 minuto', () => {
  assert.equal(emModoDemonstracao(TEMPOS_DEMONSTRACAO), true);
  assert.equal(emModoDemonstracao(TEMPOS_PADRAO), false);
});

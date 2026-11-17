import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEMPOS_DEMONSTRACAO } from '../../../packages/regras/src/index.ts';
import { aplicarRegraDoPaciente, planejarDoses, type DoseLinha, type RegraPaciente } from './doses.ts';

const agora = new Date('2026-11-20T12:00:00-03:00');
const minutosAtras = (m: number) => new Date(agora.getTime() - m * 60_000).toISOString();

function dose(parcial: Partial<DoseLinha>): DoseLinha {
  return {
    id: 'd1',
    pacienteId: 'p1',
    previstoEm: minutosAtras(0),
    confirmadoEm: null,
    critico: false,
    nomeRemedio: 'Remédio B',
    ...parcial,
  };
}

test('dose com 29 min de atraso: nada a fazer', () => {
  const plano = planejarDoses([dose({ previstoEm: minutosAtras(29) })], [], agora);
  assert.deepEqual(plano, { perdidas: [] });
});

test('dose sem "Tomei" em 30 min: alerta laranja (responsável primeiro)', () => {
  const plano = planejarDoses([dose({ previstoEm: minutosAtras(30) })], [], agora);
  assert.equal(plano.perdidas.length, 1);
  assert.equal(plano.perdidas[0].alerta.nivel, 'laranja');
  assert.equal(plano.perdidas[0].alerta.gatilho, 'dose.nao_confirmada');
  assert.match(plano.perdidas[0].alerta.motivo, /Remédio B/);
});

test('remédio crítico: mesma escalada (laranja)', () => {
  const plano = planejarDoses([dose({ previstoEm: minutosAtras(31), critico: true })], [], agora);
  assert.equal(plano.perdidas[0].alerta.nivel, 'laranja');
});

test('tempos por paciente: em modo demonstração alerta com 1 minuto', () => {
  const tempos = new Map([['p1', TEMPOS_DEMONSTRACAO]]);
  const d = [dose({ previstoEm: minutosAtras(1) }), dose({ id: 'd2', pacienteId: 'p2', previstoEm: minutosAtras(1) })];
  const plano = planejarDoses(d, [], agora, tempos);
  assert.deepEqual(plano.perdidas.map((p) => p.doseId), ['d1']); // p2 segue o padrão (30 min)
});

test('dose confirmada não gera nada, mesmo atrasada', () => {
  const plano = planejarDoses([dose({ previstoEm: minutosAtras(90), confirmadoEm: minutosAtras(5) })], [], agora);
  assert.deepEqual(plano, { perdidas: [] });
});

test('regra do paciente pode subir o nível (na dúvida, sobe)', () => {
  const regras: RegraPaciente[] = [{ id: 'r1', pacienteId: 'p1', gatilho: 'dose.nao_confirmada', nivel: 'vermelho', ativa: true }];
  const plano = planejarDoses([dose({ previstoEm: minutosAtras(40) })], regras, agora);
  assert.equal(plano.perdidas[0].alerta.nivel, 'vermelho');
  assert.equal(plano.perdidas[0].regraId, 'r1');
});

test('regra do paciente nunca baixa o nível do motor', () => {
  const regra: RegraPaciente = { id: 'r1', pacienteId: 'p1', gatilho: 'dose.nao_confirmada', nivel: 'amarelo', ativa: true };
  const r = aplicarRegraDoPaciente({ nivel: 'laranja', gatilho: 'dose.nao_confirmada', motivo: 'x' }, regra);
  assert.equal(r.alerta.nivel, 'laranja');
});

test('regra desativada: fica só no histórico (informativo)', () => {
  const regra: RegraPaciente = { id: 'r1', pacienteId: 'p1', gatilho: 'dose.nao_confirmada', nivel: 'laranja', ativa: false };
  const r = aplicarRegraDoPaciente({ nivel: 'laranja', gatilho: 'dose.nao_confirmada', motivo: 'x' }, regra);
  assert.equal(r.alerta.nivel, 'informativo');
});

test('regra de outro paciente não se aplica', () => {
  const regras: RegraPaciente[] = [{ id: 'r9', pacienteId: 'p2', gatilho: 'dose.nao_confirmada', nivel: 'vermelho', ativa: true }];
  const plano = planejarDoses([dose({ previstoEm: minutosAtras(40) })], regras, agora);
  assert.equal(plano.perdidas[0].alerta.nivel, 'laranja');
  assert.equal(plano.perdidas[0].regraId, null);
});

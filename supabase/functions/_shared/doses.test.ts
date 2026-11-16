import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aplicarRegraDoPaciente, planejarDoses, type DoseLinha, type RegraPaciente } from './doses.ts';

const agora = new Date('2026-11-20T12:00:00-03:00');
const minutosAtras = (m: number) => new Date(agora.getTime() - m * 60_000).toISOString();

function dose(parcial: Partial<DoseLinha>): DoseLinha {
  return {
    id: 'd1',
    pacienteId: 'p1',
    previstoEm: minutosAtras(0),
    confirmadoEm: null,
    realarmadoEm: null,
    critico: false,
    nomeRemedio: 'Remédio B',
    ...parcial,
  };
}

test('dose com 20 min de atraso: nada a fazer', () => {
  const plano = planejarDoses([dose({ previstoEm: minutosAtras(20) })], [], agora);
  assert.deepEqual(plano, { realarmar: [], perdidas: [] });
});

test('dose com 30 min sem confirmação: toca o alarme de novo', () => {
  const plano = planejarDoses([dose({ previstoEm: minutosAtras(30) })], [], agora);
  assert.deepEqual(plano.realarmar, ['d1']);
  assert.equal(plano.perdidas.length, 0);
});

test('realarme acontece uma vez só', () => {
  const plano = planejarDoses([dose({ previstoEm: minutosAtras(45), realarmadoEm: minutosAtras(10) })], [], agora);
  assert.deepEqual(plano.realarmar, []);
});

test('dose comum perdida (60 min): alerta laranja', () => {
  const plano = planejarDoses([dose({ previstoEm: minutosAtras(60) })], [], agora);
  assert.equal(plano.perdidas.length, 1);
  assert.equal(plano.perdidas[0].alerta.nivel, 'laranja');
  assert.equal(plano.perdidas[0].alerta.gatilho, 'dose.perdida');
  assert.match(plano.perdidas[0].alerta.motivo, /Remédio B/);
});

test('dose de remédio crítico perdida: alerta vermelho', () => {
  const plano = planejarDoses([dose({ previstoEm: minutosAtras(61), critico: true })], [], agora);
  assert.equal(plano.perdidas[0].alerta.nivel, 'vermelho');
  assert.equal(plano.perdidas[0].alerta.gatilho, 'dose.critica_perdida');
});

test('dose confirmada não gera nada, mesmo atrasada', () => {
  const plano = planejarDoses([dose({ previstoEm: minutosAtras(90), confirmadoEm: minutosAtras(5) })], [], agora);
  assert.deepEqual(plano, { realarmar: [], perdidas: [] });
});

test('regra do paciente pode subir o nível (na dúvida, sobe)', () => {
  const regras: RegraPaciente[] = [{ id: 'r1', pacienteId: 'p1', gatilho: 'dose.perdida', nivel: 'vermelho', ativa: true }];
  const plano = planejarDoses([dose({ previstoEm: minutosAtras(70) })], regras, agora);
  assert.equal(plano.perdidas[0].alerta.nivel, 'vermelho');
  assert.equal(plano.perdidas[0].regraId, 'r1');
});

test('regra do paciente nunca baixa o nível do motor', () => {
  const regra: RegraPaciente = { id: 'r1', pacienteId: 'p1', gatilho: 'dose.critica_perdida', nivel: 'amarelo', ativa: true };
  const r = aplicarRegraDoPaciente({ nivel: 'vermelho', gatilho: 'dose.critica_perdida', motivo: 'x' }, regra);
  assert.equal(r.alerta.nivel, 'vermelho');
});

test('regra desativada: fica só no histórico (informativo)', () => {
  const regra: RegraPaciente = { id: 'r1', pacienteId: 'p1', gatilho: 'dose.perdida', nivel: 'laranja', ativa: false };
  const r = aplicarRegraDoPaciente({ nivel: 'laranja', gatilho: 'dose.perdida', motivo: 'x' }, regra);
  assert.equal(r.alerta.nivel, 'informativo');
});

test('regra de outro paciente não se aplica', () => {
  const regras: RegraPaciente[] = [{ id: 'r9', pacienteId: 'p2', gatilho: 'dose.perdida', nivel: 'vermelho', ativa: true }];
  const plano = planejarDoses([dose({ previstoEm: minutosAtras(70) })], regras, agora);
  assert.equal(plano.perdidas[0].alerta.nivel, 'laranja');
  assert.equal(plano.perdidas[0].regraId, null);
});

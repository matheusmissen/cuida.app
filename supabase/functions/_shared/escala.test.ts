import { test } from 'node:test';
import assert from 'node:assert/strict';
import { destinatariosIniciais, ordemDaEscala, proximosDaEscala, type Cuidador } from './escala.ts';

const filha: Cuidador = { usuarioId: 'filha', papel: 'apoio', ordemEscala: 2, pushToken: 'ExponentPushToken[b]' };
const neto: Cuidador = { usuarioId: 'neto', papel: 'principal', ordemEscala: 1, pushToken: 'ExponentPushToken[a]' };
const vizinha: Cuidador = { usuarioId: 'vizinha', papel: 'apoio', ordemEscala: 3, pushToken: null };
const circulo = [vizinha, filha, neto];

const criadoEm = '2026-11-20T12:00:00-03:00';
const depois = (min: number) => new Date(Date.parse(criadoEm) + min * 60_000);

test('escala: principal primeiro, depois pela ordem', () => {
  assert.deepEqual(ordemDaEscala(circulo).map((c) => c.usuarioId), ['neto', 'filha', 'vizinha']);
});

test('vermelho avisa todo o círculo na hora', () => {
  assert.equal(destinatariosIniciais('vermelho', circulo).length, 3);
});

test('laranja avisa só o principal', () => {
  assert.deepEqual(destinatariosIniciais('laranja', circulo).map((c) => c.usuarioId), ['neto']);
});

test('amarelo e informativo não mandam push na hora', () => {
  assert.equal(destinatariosIniciais('amarelo', circulo).length, 0);
  assert.equal(destinatariosIniciais('informativo', circulo).length, 0);
});

test('laranja sem ação do responsável em 15 min: avisa todos os outros de uma vez', () => {
  const alerta = { nivel: 'laranja' as const, criadoEm, avisados: ['neto'], vistoEm: null };
  assert.deepEqual(proximosDaEscala(alerta, circulo, depois(14)), []);
  assert.deepEqual(proximosDaEscala(alerta, circulo, depois(15)).map((c) => c.usuarioId), ['filha', 'vizinha']);
});

test('escalada configurável: 1 minuto na demonstração', () => {
  const alerta = { nivel: 'laranja' as const, criadoEm, avisados: ['neto'], vistoEm: null };
  assert.deepEqual(proximosDaEscala(alerta, circulo, depois(0.5), 1), []);
  assert.equal(proximosDaEscala(alerta, circulo, depois(1), 1).length, 2);
});

test('reenviar o lembrete dá mais 15 min ao responsável antes de avisar o grupo', () => {
  const alerta = { nivel: 'laranja' as const, criadoEm, avisados: ['neto'], vistoEm: null, acaoEm: depois(10).toISOString() };
  assert.deepEqual(proximosDaEscala(alerta, circulo, depois(20)), [], '15 min contados do reenvio (aos 10)');
  assert.equal(proximosDaEscala(alerta, circulo, depois(25)).length, 2);
});

test('depois de avisar todos, não repete', () => {
  const todos = { nivel: 'laranja' as const, criadoEm, avisados: ['neto', 'filha', 'vizinha'], vistoEm: null };
  assert.deepEqual(proximosDaEscala(todos, circulo, depois(200)), []);
});

test('alerta visto (responsável agiu) para a escala', () => {
  const alerta = { nivel: 'laranja' as const, criadoEm, avisados: ['neto'], vistoEm: depois(10).toISOString() };
  assert.deepEqual(proximosDaEscala(alerta, circulo, depois(90)), []);
});

test('vermelho não escala (já avisou todos)', () => {
  const alerta = { nivel: 'vermelho' as const, criadoEm, avisados: [], vistoEm: null };
  assert.deepEqual(proximosDaEscala(alerta, circulo, depois(90)), []);
});

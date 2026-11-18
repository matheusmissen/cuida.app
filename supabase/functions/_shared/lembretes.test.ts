import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEMPOS_DEMONSTRACAO } from '../../../packages/regras/src/index.ts';
import {
  deveLembrarCheckin,
  dosesParaLembrar,
  notificacaoDoAlerta,
  notificacaoDoCheckin,
  notificacaoDoRemedio,
  type DoseParaLembrar,
} from './lembretes.ts';
import { chavesVapid } from './notificar.ts';

const em = (hora: string, dia = '2026-11-20') => new Date(`${dia}T${hora}:00-03:00`);

test('alerta para a família: emergência e alerta crítico ficam na tela (urgentes)', () => {
  const v = notificacaoDoAlerta({ nivel: 'vermelho', gatilho: 'geral.queda', motivo: 'Relatou uma queda.' }, 'a1', 'Dona Maria');
  assert.equal(v.titulo, 'Emergência · Dona Maria');
  assert.equal(v.corpo, 'Relatou uma queda.');
  assert.equal(v.etiqueta, 'alerta-a1');
  assert.equal(v.urgente, true);
  const l = notificacaoDoAlerta({ nivel: 'laranja', gatilho: 'dose.nao_confirmada', motivo: 'x' }, 'a2', 'Dona Maria');
  assert.equal(l.titulo, 'Alerta crítico · Dona Maria');
  assert.equal(l.urgente, true);
});

function dose(parcial: Partial<DoseParaLembrar>): DoseParaLembrar {
  return { id: 'd1', pacienteId: 'p1', previstoEm: em('08:00').toISOString(), confirmadoEm: null, lembreteEm: null, ...parcial };
}

test('lembrete do remédio: no horário, uma vez, e só até a tolerância', () => {
  const tempos = new Map();
  assert.deepEqual(dosesParaLembrar([dose({})], tempos, em('07:59')), []);
  assert.deepEqual(dosesParaLembrar([dose({})], tempos, em('08:00')), ['d1']);
  assert.deepEqual(dosesParaLembrar([dose({})], tempos, em('08:29')), ['d1']);
  assert.deepEqual(dosesParaLembrar([dose({})], tempos, em('08:30')), [], 'depois de 30 min, quem é avisado é a família');
  assert.deepEqual(dosesParaLembrar([dose({ lembreteEm: em('08:00').toISOString() })], tempos, em('08:05')), []);
  assert.deepEqual(dosesParaLembrar([dose({ confirmadoEm: em('08:01').toISOString() })], tempos, em('08:05')), []);
});

test('lembrete do remédio no modo demonstração: janela de 1 minuto', () => {
  const tempos = new Map([['p1', TEMPOS_DEMONSTRACAO]]);
  assert.deepEqual(dosesParaLembrar([dose({})], tempos, new Date(em('08:00').getTime() + 30_000)), ['d1']);
  assert.deepEqual(dosesParaLembrar([dose({})], tempos, em('08:01')), []);
});

test('texto do lembrete do remédio', () => {
  const n = notificacaoDoRemedio('d1', 'Remédio A', '1 comprimido');
  assert.equal(n.titulo, 'Hora do remédio');
  assert.equal(n.corpo, 'Remédio A, 1 comprimido. Toque para confirmar.');
  assert.equal(n.etiqueta, 'dose-d1');
  assert.equal(notificacaoDoRemedio('d1', 'Remédio A', null).corpo, 'Remédio A. Toque para confirmar.');
});

test('lembrete do check-in: depois do horário, uma vez por dia, nunca se já fez', () => {
  assert.equal(deveLembrarCheckin('08:00', em('07:59'), null, null), false);
  assert.equal(deveLembrarCheckin('08:00', em('08:00'), null, null), true);
  assert.equal(deveLembrarCheckin('08:00', em('08:10'), null, em('08:00').toISOString()), false, 'já lembrou hoje');
  assert.equal(deveLembrarCheckin('08:00', em('08:00'), null, em('08:00', '2026-11-19').toISOString()), true, 'lembrete de ontem');
  assert.equal(deveLembrarCheckin('08:00', em('09:00'), em('08:05').toISOString(), null), false, 'já fez o check-in');
  assert.equal(deveLembrarCheckin('99:00', em('09:00'), null, null), false, 'horário inválido');
});

test('texto do lembrete do check-in usa o horário de Brasília', () => {
  assert.equal(notificacaoDoCheckin('Dona Maria', em('08:00')).titulo, 'Bom dia, Dona Maria!');
  assert.equal(notificacaoDoCheckin('Dona Maria', em('19:00')).titulo, 'Boa noite, Dona Maria!');
});

test('chaves VAPID vêm dos segredos; sem elas, nada é enviado', () => {
  assert.equal(chavesVapid(() => undefined), null);
  const env: Record<string, string> = { VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv' };
  assert.deepEqual(chavesVapid((n) => env[n]), { publica: 'pub', privada: 'priv', assunto: 'https://cuida-app-familia.vercel.app' });
});

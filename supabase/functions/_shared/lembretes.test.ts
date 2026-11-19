import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEMPOS_DEMONSTRACAO } from '../../../packages/regras/src/index.ts';
import {
  deveLembrarCheckin,
  dosesAdiadasParaLembrar,
  dosesParaLembrar,
  notificacaoDoAlerta,
  notificacaoDoCheckin,
  notificacaoDeReenvio,
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

test('reenviar lembrete: remédio, check-in ou chamado da família', () => {
  const dose = { id: 'd9', nomeRemedio: 'Remédio A', dose: '1 comprimido' };
  assert.equal(notificacaoDeReenvio('dose.nao_confirmada', 'Dona Maria', em('08:40'), dose).titulo, 'Hora do remédio');
  assert.equal(notificacaoDeReenvio('dose.nao_confirmada', 'Dona Maria', em('08:40'), dose).etiqueta, 'dose-d9');
  assert.equal(notificacaoDeReenvio('geral.checkin_sem_resposta', 'Dona Maria', em('08:20')).titulo, 'Bom dia, Dona Maria!');
  const outro = notificacaoDeReenvio('leucemia.febre', 'Dona Maria', em('10:00'));
  assert.match(outro.titulo, /sua família quer saber de você/);
  assert.equal(outro.urgente, true);
  assert.match(notificacaoDeReenvio('dose.nao_confirmada', 'Dona Maria', em('10:00'), null).titulo, /família/, 'sem a dose, chamado genérico');
});

test('consultas: lembrete na véspera a partir das 10h e 3 horas antes, uma vez cada', async () => {
  const { consultasParaLembrar, notificacaoDaConsulta } = await import('./lembretes.ts');
  // Consulta sábado 28/11 às 14:00 de Brasília (17:00 UTC).
  const c = { id: 'c1', quando: '2026-11-28T17:00:00Z', lembreteVesperaEm: null, lembreteHorasEm: null };
  // Sexta 9h (Brasília): ainda cedo para o da véspera.
  assert.deepEqual(consultasParaLembrar([c], new Date('2026-11-27T12:00:00Z')), []);
  // Sexta 10h: sai o da véspera.
  assert.deepEqual(consultasParaLembrar([c], new Date('2026-11-27T13:00:00Z')), [{ id: 'c1', tipo: 'vespera' }]);
  // Já mandado: não repete.
  assert.deepEqual(consultasParaLembrar([{ ...c, lembreteVesperaEm: '2026-11-27T13:00:00Z' }], new Date('2026-11-27T20:00:00Z')), []);
  // Sábado 11:00 (3 h antes): sai o de horas.
  assert.deepEqual(consultasParaLembrar([c], new Date('2026-11-28T14:00:00Z')), [{ id: 'c1', tipo: 'horas' }]);
  // Depois da consulta: nada.
  assert.deepEqual(consultasParaLembrar([c], new Date('2026-11-28T18:00:00Z')), []);
  // Consulta marcada em cima da hora (daqui a 1 h): só o de horas.
  assert.deepEqual(
    consultasParaLembrar([{ ...c, quando: '2026-11-27T14:00:00Z' }], new Date('2026-11-27T13:00:00Z')),
    [{ id: 'c1', tipo: 'horas' }],
  );
  const n = notificacaoDaConsulta('vespera', 'Maria', { id: 'c1', quando: c.quando, medico: 'Dra. Ana', especialidade: 'Hematologia', local: 'Clínica Exemplo' });
  assert.equal(n.titulo, 'Maria, amanhã tem consulta');
  assert.equal(n.corpo, 'Às 14:00, com Dra. Ana, Hematologia. Local: Clínica Exemplo.');
});

test('lembrar em 10 minutos: volta uma vez, só sem "Tomei", e não manda adiamento velho', () => {
  const adiada = (p: Partial<Parameters<typeof dosesAdiadasParaLembrar>[0][0]>) => ({
    id: 'd1',
    adiadaAte: em('08:10').toISOString(),
    confirmadoEm: null,
    lembreteAdiadoEm: null,
    ...p,
  });
  assert.deepEqual(dosesAdiadasParaLembrar([adiada({})], em('08:09')), [], 'ainda não deu a hora');
  assert.deepEqual(dosesAdiadasParaLembrar([adiada({})], em('08:10')), ['d1']);
  assert.deepEqual(dosesAdiadasParaLembrar([adiada({ lembreteAdiadoEm: em('08:10').toISOString() })], em('08:11')), []);
  assert.deepEqual(dosesAdiadasParaLembrar([adiada({ confirmadoEm: em('08:05').toISOString() })], em('08:10')), []);
  assert.deepEqual(dosesAdiadasParaLembrar([adiada({ adiadaAte: null })], em('08:10')), []);
  assert.deepEqual(dosesAdiadasParaLembrar([adiada({})], em('09:10')), [], 'depois de 1 hora não manda mais');
});

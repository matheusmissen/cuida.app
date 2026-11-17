import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deveRealarmar, dosesDevidas, instantesDeAlarme, proximaDose, situacaoDose } from '../src/doses.ts';
import { horaCurta, lerHora, saudacao } from '../src/formato.ts';
import type { DoseComRemedio } from '../src/tipos.ts';

const agora = new Date('2026-11-20T12:00:00-03:00');
const min = (m: number) => new Date(agora.getTime() + m * 60_000).toISOString();

function dose(id: string, previstoEm: string, extra: Partial<DoseComRemedio> = {}): DoseComRemedio {
  return {
    id,
    horario_id: 'h',
    paciente_id: 'p',
    previsto_em: previstoEm,
    confirmado_em: null,
    realarmado_em: null,
    status: 'pendente',
    horarios: { remedios: { id: 'r', nome: 'Vitamina D', dose: '10 gotas', foto_url: null, critico: false } },
    ...extra,
  };
}

test('situação da dose segue o motor de regras', () => {
  assert.equal(situacaoDose(dose('a', min(10)), agora), 'futura');
  assert.equal(situacaoDose(dose('a', min(-5)), agora), 'agora');
  assert.equal(situacaoDose(dose('a', min(-30)), agora), 'atrasada');
  assert.equal(situacaoDose(dose('a', min(-60)), agora), 'perdida');
  assert.equal(situacaoDose(dose('a', min(-90), { confirmado_em: min(-80), status: 'tomado' }), agora), 'tomada');
  assert.equal(situacaoDose(dose('a', min(-5), { status: 'perdido' }), agora), 'perdida');
});

test('alarme mostra doses vencidas e não confirmadas, mais antigas primeiro', () => {
  const doses = [
    dose('futura', min(30)),
    dose('agora', min(-1)),
    dose('tomada', min(-40), { confirmado_em: min(-35) }),
    dose('antiga', min(-45)),
    dose('ontem', min(-60 * 20)),
  ];
  assert.deepEqual(dosesDevidas(doses, agora).map((d) => d.id), ['antiga', 'agora']);
});

test('dose perdida (já avisada à família) continua no alarme para o "Tomei" atrasado', () => {
  assert.deepEqual(dosesDevidas([dose('p', min(-90), { status: 'perdido' })], agora).map((d) => d.id), ['p']);
});

test('próxima dose é a primeira futura não confirmada', () => {
  const doses = [dose('b', min(120)), dose('a', min(60)), dose('c', min(-10))];
  assert.equal(proximaDose(doses, agora)?.id, 'a');
  assert.equal(proximaDose([dose('c', min(-10))], agora), null);
});

test('realarme aos 30 min (ou quando o servidor pedir)', () => {
  assert.equal(deveRealarmar(dose('a', min(-29)), agora), false);
  assert.equal(deveRealarmar(dose('a', min(-30)), agora), true);
  assert.equal(deveRealarmar(dose('a', min(-5), { realarmado_em: min(-1) }), agora), true);
});

test('celular toca no horário e 30 min depois, só no futuro', () => {
  assert.equal(instantesDeAlarme(dose('a', min(10)), agora).length, 2);
  assert.equal(instantesDeAlarme(dose('a', min(-10)), agora).length, 1);
  assert.equal(instantesDeAlarme(dose('a', min(-40)), agora).length, 0);
  assert.equal(instantesDeAlarme(dose('a', min(10), { confirmado_em: min(0) }), agora).length, 0);
});

test('formatação em horário de Brasília', () => {
  assert.equal(horaCurta('2026-11-20T11:00:00Z'), '08:00');
  assert.equal(saudacao(new Date('2026-11-20T11:00:00Z')), 'Bom dia');
  assert.equal(saudacao(new Date('2026-11-20T18:00:00Z')), 'Boa tarde');
  assert.equal(saudacao(new Date('2026-11-21T00:30:00Z')), 'Boa noite');
});

test('lê horários digitados pela família', () => {
  assert.equal(lerHora('8'), '08:00');
  assert.equal(lerHora('8h'), '08:00');
  assert.equal(lerHora('20:30'), '20:30');
  assert.equal(lerHora('8h30'), '08:30');
  assert.equal(lerHora('25:00'), null);
  assert.equal(lerHora('meio-dia'), null);
});

import { dataCurta } from '../src/formato.ts';

test('data curta em português, sem "-feira"', () => {
  assert.equal(dataCurta(new Date('2026-11-20T12:00:00Z')), 'Sexta, 20 de novembro');
  assert.equal(dataCurta(new Date('2026-11-22T12:00:00Z')), 'Domingo, 22 de novembro');
});

import { dividirMotivo } from '../src/formato.ts';

test('motivo do alerta vira título e explicação', () => {
  assert.deepEqual(dividirMotivo('Febre ou calafrio (38,2 °C). Em tratamento de leucemia, procurar o médico.'), {
    titulo: 'Febre ou calafrio (38,2 °C)',
    detalhe: 'Em tratamento de leucemia, procurar o médico.',
  });
  assert.deepEqual(dividirMotivo('Relatou uma queda.'), { titulo: 'Relatou uma queda', detalhe: null });
  assert.deepEqual(dividirMotivo('Não confirmou Remédio A (oral) há mais de 1 hora.'), {
    titulo: 'Não confirmou Remédio A (oral) há mais de 1 hora',
    detalhe: null,
  });
});

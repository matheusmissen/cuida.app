import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dataValida, hojeEmBrasilia, horaValida, normalizarPedido } from './pedido.ts';

const HOJE = '2026-11-20';

test('pedido completo e legível: sugere tudo e não precisa de revisão', () => {
  const p = normalizarPedido(
    {
      tipo_pedido: 'consulta',
      descricao: 'Avaliação',
      medico: 'Dra. Ana Lima',
      especialidade: 'Hematologia',
      data: '2026-12-03',
      hora: '14:30',
      local: 'Clínica Exemplo, sala 3',
      preparo: 'Levar os exames de sangue',
      confianca: 'alta',
    },
    HOJE,
  );
  assert.equal(p.medico, 'Dra. Ana Lima');
  assert.equal(p.especialidade, 'Hematologia');
  assert.equal(p.data, '2026-12-03');
  assert.equal(p.hora, '14:30');
  assert.equal(p.observacao, 'Avaliação. Preparo: Levar os exames de sangue');
  assert.equal(p.precisa_revisao, false);
  assert.deepEqual(p.motivos, []);
});

test('retorno em 30 dias: a data vem do prazo e pede confirmação', () => {
  const p = normalizarPedido({ tipo_pedido: 'retorno', especialidade: 'Cardiologia', prazo_dias: 30, confianca: 'alta' }, HOJE);
  assert.equal(p.data, '2026-12-20');
  assert.equal(p.data_pelo_prazo, true);
  assert.equal(p.hora, null);
  assert.equal(p.precisa_revisao, true);
  assert.ok(p.motivos.some((m) => m.includes('prazo de 30 dias')));
  assert.ok(p.motivos.some((m) => m.includes('Sem horário')));
});

test('pedido de exame sem especialidade: o exame vira a especialidade', () => {
  const p = normalizarPedido(
    { tipo_pedido: 'exame', descricao: 'Hemograma completo', preparo: 'jejum de 8 horas', confianca: 'alta' },
    HOJE,
  );
  assert.equal(p.especialidade, 'Hemograma completo');
  assert.equal(p.observacao, 'Preparo: jejum de 8 horas');
  assert.ok(p.motivos.some((m) => m.includes('Sem data')));
});

test('data que já passou ou inválida não é sugerida', () => {
  const passada = normalizarPedido({ especialidade: 'Hematologia', data: '2026-11-01', hora: '09:00', confianca: 'alta' }, HOJE);
  assert.equal(passada.data, null);
  assert.ok(passada.motivos.some((m) => m.includes('já passou')));
  const invalida = normalizarPedido({ especialidade: 'Hematologia', data: '2026-02-30', hora: '09:00', confianca: 'alta' }, HOJE);
  assert.equal(invalida.data, null);
  assert.ok(invalida.motivos.some((m) => m.includes('não foi entendida')));
});

test('leitura incerta ou sem médico nem especialidade vai para revisão', () => {
  const p = normalizarPedido({ data: '2026-12-01', hora: '10:00', confianca: 'media' }, HOJE);
  assert.equal(p.precisa_revisao, true);
  assert.ok(p.motivos.some((m) => m.includes('médico ou a especialidade')));
  assert.ok(p.motivos.some((m) => m.includes('Leitura incerta')));
});

test('entrada estranha não quebra: tudo vazio e em revisão', () => {
  for (const bruto of [null, undefined, 'texto', 42, { tipo_pedido: 'hack', confianca: 'total' }]) {
    const p = normalizarPedido(bruto, HOJE);
    assert.equal(p.tipo_pedido, 'outro');
    assert.equal(p.data, null);
    assert.equal(p.precisa_revisao, true);
  }
});

test('textos longos são cortados aos limites da tabela consultas', () => {
  const p = normalizarPedido({ medico: 'x'.repeat(200), especialidade: 'y'.repeat(200), local: 'z'.repeat(300) }, HOJE);
  assert.equal(p.medico.length, 80);
  assert.equal(p.especialidade.length, 60);
  assert.equal(p.local.length, 120);
});

test('datas e horas aceitas', () => {
  assert.equal(dataValida('2026-12-31'), '2026-12-31');
  assert.equal(dataValida('31/12/2026'), null);
  assert.equal(horaValida('9:30'), '09:30');
  assert.equal(horaValida('14h'), '14:00');
  assert.equal(horaValida('09h15'), '09:15');
  assert.equal(horaValida('25:00'), null);
  assert.equal(hojeEmBrasilia(new Date('2026-11-21T02:00:00Z')), '2026-11-20');
});

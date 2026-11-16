// Testes da lógica pura das Edge Functions. Rodar na raiz com: npm test
// Todos os dados são fictícios.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { diaDaSemana, gerarDosesDoDia, instanteLocal } from '../_shared/logica/doses.ts';
import { devemSerAvisados, novosDestinatarios } from '../_shared/logica/escala.ts';
import { mensagemRealarme, montarMensagens } from '../_shared/logica/push.ts';
import { deLinha, paraLinha, temperaturaValida } from '../_shared/logica/mapeamento.ts';

describe('doses do dia', () => {
  const horarios = [
    { id: 'h-noite', paciente_id: 'p1', hora: '20:00:00', dias_semana: [0, 1, 2, 3, 4, 5, 6] },
    { id: 'h-manha', paciente_id: 'p1', hora: '08:00', dias_semana: [0, 1, 2, 3, 4, 5, 6] },
    { id: 'h-seg', paciente_id: 'p1', hora: '12:00', dias_semana: [1] },
  ];

  it('converte horário de Brasília para UTC', () => {
    assert.equal(instanteLocal('2026-11-20', '08:00'), '2026-11-20T11:00:00.000Z');
    assert.equal(instanteLocal('2026-11-20', '22:30'), '2026-11-21T01:30:00.000Z');
  });

  it('20/11/2026 é sexta-feira', () => {
    assert.equal(diaDaSemana('2026-11-20'), 5);
  });

  it('gera só os horários do dia da semana, em ordem', () => {
    const sexta = gerarDosesDoDia(horarios, '2026-11-20');
    assert.deepEqual(sexta.map((d) => d.horario_id), ['h-manha', 'h-noite']);
    const segunda = gerarDosesDoDia(horarios, '2026-11-23');
    assert.deepEqual(segunda.map((d) => d.horario_id), ['h-manha', 'h-seg', 'h-noite']);
  });
});

describe('escala de avisos', () => {
  const cuidadores = [
    { usuario_id: 'filha', ordem_escala: 2, expo_push_token: 'ExponentPushToken[b]' },
    { usuario_id: 'neto', ordem_escala: 1, expo_push_token: 'ExponentPushToken[a]' },
    { usuario_id: 'vizinha', ordem_escala: 3, expo_push_token: null },
  ];
  const ids = (l: { usuario_id: string }[]) => l.map((c) => c.usuario_id);

  it('vermelho avisa todo o círculo na hora', () => {
    assert.deepEqual(ids(devemSerAvisados('vermelho', cuidadores, 0)), ['neto', 'filha', 'vizinha']);
  });

  it('laranja começa pelo primeiro da escala e sobe a cada 30 min', () => {
    assert.deepEqual(ids(devemSerAvisados('laranja', cuidadores, 0)), ['neto']);
    assert.deepEqual(ids(devemSerAvisados('laranja', cuidadores, 29)), ['neto']);
    assert.deepEqual(ids(devemSerAvisados('laranja', cuidadores, 30)), ['neto', 'filha']);
    assert.deepEqual(ids(devemSerAvisados('laranja', cuidadores, 61)), ['neto', 'filha', 'vizinha']);
  });

  it('amarelo não avisa ninguém na hora', () => {
    assert.deepEqual(devemSerAvisados('amarelo', cuidadores, 999), []);
  });

  it('não repete aviso e para de escalar quando alguém viu', () => {
    assert.deepEqual(ids(novosDestinatarios('laranja', cuidadores, 31, ['neto'], false)), ['filha']);
    assert.deepEqual(novosDestinatarios('laranja', cuidadores, 31, ['neto'], true), []);
  });
});

describe('push', () => {
  it('ignora tokens inválidos ou repetidos', () => {
    const msgs = montarMensagens(
      ['ExponentPushToken[a]', 'ExponentPushToken[a]', 'lixo', 'ExpoPushToken[b]'],
      { id: 'al1', nivel: 'vermelho', motivo: 'Febre ou calafrio.' },
      'Dona Maria',
    );
    assert.equal(msgs.length, 2);
    assert.equal(msgs[0].title, 'Urgente: Dona Maria');
    assert.equal(msgs[0].priority, 'high');
    assert.equal(msgs[0].channelId, 'alertas-urgentes');
  });

  it('realarme fala com o idoso', () => {
    assert.match(mensagemRealarme('ExponentPushToken[i]', 'Remédio A', '1 comprimido').body, /Tomei/);
  });
});

describe('mapeamento de check-in', () => {
  it('aceita temperatura com vírgula e descarta valores impossíveis', () => {
    assert.equal(temperaturaValida('38,2'), 38.2);
    assert.equal(temperaturaValida(382), null);
    assert.equal(temperaturaValida('quente'), null);
  });

  it('ida e volta preserva os campos', () => {
    const linha = paraLinha(
      { feitoEm: '2026-11-20T09:00:00-03:00', febre: true, temperatura: 38.1, cansaco: 'forte', humor: 'baixo' },
      'p1',
      { notas: 'Disse que está quentinha.' },
    );
    assert.equal(linha.paciente_id, 'p1');
    assert.equal(linha.notas, 'Disse que está quentinha.');
    const volta = deLinha(linha);
    assert.equal(volta.febre, true);
    assert.equal(volta.temperatura, 38.1);
    assert.equal(volta.cansaco, 'forte');
    assert.equal(volta.sangramento, undefined);
  });

  it('descarta valores fora dos enums', () => {
    const c = deLinha({ paciente_id: 'p1', feito_em: '2026-11-20T09:00:00-03:00', cansaco: 'muito', humor: 'feliz' });
    assert.equal(c.cansaco, undefined);
    assert.equal(c.humor, undefined);
  });
});

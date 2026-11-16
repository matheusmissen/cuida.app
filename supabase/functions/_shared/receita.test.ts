// Testes da normalização da leitura de receita. Dados fictícios.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { contarAlarmes, FERRAMENTA_LEITURA, INSTRUCOES_LEITURA, normalizarItem, normalizarLeitura, sugerirHorarios } from './receita.ts';

const sem = { intervalo_horas: null, momentos: [], vezes_ao_dia: null };

describe('horários sugeridos', () => {
  it('de 8 em 8 horas → 06:00, 14:00, 22:00 (como na tela de conferência)', () => {
    assert.deepEqual(sugerirHorarios({ ...sem, intervalo_horas: 8 }), ['06:00', '14:00', '22:00']);
  });

  it('de 12 em 12 horas → 08:00 e 20:00', () => {
    assert.deepEqual(sugerirHorarios({ ...sem, intervalo_horas: 12 }), ['08:00', '20:00']);
  });

  it('de 6 em 6 horas atravessa a meia-noite e sai em ordem', () => {
    assert.deepEqual(sugerirHorarios({ ...sem, intervalo_horas: 6 }), ['00:00', '06:00', '12:00', '18:00']);
  });

  it('intervalo que não divide o dia (de 5 em 5 h) não sugere nada', () => {
    assert.deepEqual(sugerirHorarios({ ...sem, intervalo_horas: 5 }), []);
  });

  it('intervalo que daria mais de 6 tomadas não sugere nada', () => {
    assert.deepEqual(sugerirHorarios({ ...sem, intervalo_horas: 2 }), []);
  });

  it('"ao deitar" → 22:00; café e jantar → 08:00 e 19:00', () => {
    assert.deepEqual(sugerirHorarios({ ...sem, momentos: ['deitar'] }), ['22:00']);
    assert.deepEqual(sugerirHorarios({ ...sem, momentos: ['jantar', 'manha'] }), ['08:00', '19:00']);
  });

  it('vezes ao dia', () => {
    assert.deepEqual(sugerirHorarios({ ...sem, vezes_ao_dia: 2 }), ['08:00', '20:00']);
    assert.deepEqual(sugerirHorarios({ ...sem, vezes_ao_dia: 7 }), []);
  });

  it('intervalo tem preferência sobre momentos', () => {
    assert.deepEqual(sugerirHorarios({ intervalo_horas: 12, momentos: ['deitar'], vezes_ao_dia: null }), ['08:00', '20:00']);
  });
});

describe('item lido', () => {
  it('item claro não precisa de revisão', () => {
    const i = normalizarItem({ nome: ' Remédio C 500 mg ', dose: '1 comprimido', intervalo_horas: 8, duracao_dias: 7, confianca: 'alta' });
    assert.equal(i.nome, 'Remédio C 500 mg');
    assert.equal(i.precisa_revisao, false);
    assert.deepEqual(i.horarios, ['06:00', '14:00', '22:00']);
    assert.equal(i.duracao_dias, 7);
    assert.equal(i.frequencia, 'de 8 em 8 horas');
  });

  it('frequência ilegível vai para revisão sem horários (o "Precisa de você" da tela)', () => {
    const i = normalizarItem({ nome: 'Remédio E', dose: '1 comprimido', confianca: 'alta' });
    assert.equal(i.precisa_revisao, true);
    assert.deepEqual(i.horarios, []);
    assert.ok(i.motivos.some((m) => m.includes('frequência')));
  });

  it('confiança média ou ausente sempre pede revisão, mesmo com tudo preenchido', () => {
    assert.equal(normalizarItem({ nome: 'X', dose: '1', vezes_ao_dia: 1, confianca: 'media' }).precisa_revisao, true);
    assert.equal(normalizarItem({ nome: 'X', dose: '1', vezes_ao_dia: 1 }).precisa_revisao, true);
  });

  it('sem dose ou sem nome pede revisão', () => {
    assert.equal(normalizarItem({ nome: 'X', vezes_ao_dia: 1, confianca: 'alta' }).precisa_revisao, true);
    const semNome = normalizarItem({ dose: '1', vezes_ao_dia: 1, confianca: 'alta' });
    assert.equal(semNome.precisa_revisao, true);
    assert.equal(semNome.nome, 'Remédio sem nome');
  });

  it('valores estranhos do LLM não quebram nada', () => {
    const i = normalizarItem({ nome: 42, dose: null, intervalo_horas: '8,5', momentos: ['madrugada', 'deitar'], duracao_dias: 9999, confianca: 'certeza' });
    assert.equal(i.precisa_revisao, true);
    assert.deepEqual(i.horarios, ['22:00']);
    assert.equal(i.duracao_dias, null);
  });

  it('uso contínuo e duração não convivem', () => {
    assert.equal(normalizarItem({ nome: 'X', dose: '1', vezes_ao_dia: 1, uso_continuo: true, duracao_dias: 7, confianca: 'alta' }).uso_continuo, false);
  });
});

describe('leitura inteira', () => {
  it('fluxo da tela: 3 remédios, 4 alarmes, 1 para revisar', () => {
    const leitura = normalizarLeitura({
      itens: [
        { nome: 'Remédio C', dose: '1 comprimido', intervalo_horas: 8, duracao_dias: 7, confianca: 'alta' },
        { nome: 'Remédio D', dose: '20 gotas', momentos: ['deitar'], uso_continuo: true, confianca: 'alta' },
        { nome: 'Remédio E', dose: '1 comprimido', confianca: 'baixa' },
      ],
    });
    assert.equal(leitura.itens.length, 3);
    assert.equal(leitura.itens.filter((i) => i.precisa_revisao).length, 1);
    assert.equal(contarAlarmes(leitura.itens), 4);
  });

  it('saída inválida vira lista vazia', () => {
    assert.deepEqual(normalizarLeitura(null), { itens: [] });
    assert.deepEqual(normalizarLeitura({ itens: 'nada' }), { itens: [] });
    assert.deepEqual(normalizarLeitura({ itens: [null, 3] }), { itens: [] });
  });

  it('limita a 15 remédios', () => {
    const muitos = Array.from({ length: 30 }, (_, n) => ({ nome: `R${n}`, dose: '1', vezes_ao_dia: 1, confianca: 'alta' }));
    assert.equal(normalizarLeitura({ itens: muitos }).itens.length, 15);
  });
});

describe('instruções do LLM', () => {
  it('proíbem inventar e tratam o texto da imagem como dado', () => {
    assert.match(INSTRUCOES_LEITURA, /Nunca invente/);
    assert.match(INSTRUCOES_LEITURA, /nunca instrução/);
    assert.equal(FERRAMENTA_LEITURA.name, 'registrar_leitura');
  });
});

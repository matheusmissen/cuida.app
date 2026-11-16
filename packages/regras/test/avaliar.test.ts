// Testes do motor de regras. Rodar com: npm test (em packages/regras)
// Todos os dados são fictícios.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  avaliarCheckin,
  avaliarCheckinSemResposta,
  avaliarDose,
  avaliarEstoque,
  avaliarNaoEntendeu,
  avaliarSilencio,
  dataLocal,
  diasSeguidos,
  nivelMaximo,
  pedidoDeAjuda,
} from '../src/index.ts';
import type { Checkin, ConfigPaciente } from '../src/index.ts';

const leucemia: ConfigPaciente = { condicoes: ['leucemia'] };
const semCondicao: ConfigPaciente = { condicoes: [] };

const dia = (d: number, hora = '09:00'): string => `2026-11-${String(d).padStart(2, '0')}T${hora}:00-03:00`;
const checkin = (d: number, extra: Partial<Checkin> = {}): Checkin => ({ feitoEm: dia(d), ...extra });
const gatilhos = (alertas: { gatilho: string }[]) => alertas.map((a) => a.gatilho);

describe('leucemia: febre', () => {
  it('relato de febre gera alerta vermelho', () => {
    const alertas = avaliarCheckin(checkin(20, { febre: true }), [], leucemia);
    assert.equal(nivelMaximo(alertas), 'vermelho');
    assert.ok(gatilhos(alertas).includes('leucemia.febre'));
  });

  it('calafrio sem temperatura também conta como febre', () => {
    const alertas = avaliarCheckin(checkin(20, { calafrio: true }), [], leucemia);
    assert.ok(gatilhos(alertas).includes('leucemia.febre'));
  });

  it('temperatura no limite padrão (37,8) dispara', () => {
    const alertas = avaliarCheckin(checkin(20, { temperatura: 37.8 }), [], leucemia);
    assert.ok(gatilhos(alertas).includes('leucemia.febre'));
    assert.match(alertas[0].motivo, /37\.8 °C/);
  });

  it('temperatura abaixo do limite não dispara', () => {
    const alertas = avaliarCheckin(checkin(20, { temperatura: 37.2 }), [], leucemia);
    assert.deepEqual(alertas, []);
  });

  it('respeita o limite configurado pelo médico', () => {
    const config = { condicoes: ['leucemia'], limiteFebre: 38.0 };
    assert.deepEqual(avaliarCheckin(checkin(20, { temperatura: 37.9 }), [], config), []);
    assert.ok(gatilhos(avaliarCheckin(checkin(20, { temperatura: 38.0 }), [], config)).includes('leucemia.febre'));
  });

  it('paciente sem leucemia não recebe a regra de febre do modelo', () => {
    assert.deepEqual(avaliarCheckin(checkin(20, { febre: true }), [], semCondicao), []);
  });
});

describe('leucemia: outros sinais', () => {
  it('sangramento é vermelho', () => {
    const alertas = avaliarCheckin(checkin(20, { sangramento: true }), [], leucemia);
    assert.deepEqual(gatilhos(alertas), ['leucemia.sangramento']);
    assert.equal(alertas[0].nivel, 'vermelho');
  });

  it('manchas roxas e sinais de infecção são laranja', () => {
    const alertas = avaliarCheckin(checkin(20, { manchas: true, sinaisInfeccao: true }), [], leucemia);
    assert.deepEqual(alertas.map((a) => a.nivel), ['laranja', 'laranja']);
  });

  it('cansaço forte só alerta no terceiro dia seguido', () => {
    const anteriores = [checkin(18, { cansaco: 'forte' }), checkin(19, { cansaco: 'forte' })];
    assert.deepEqual(avaliarCheckin(checkin(19, { cansaco: 'forte' }), [checkin(18, { cansaco: 'forte' })], leucemia), []);
    assert.ok(gatilhos(avaliarCheckin(checkin(20, { cansaco: 'forte' }), anteriores, leucemia)).includes('leucemia.cansaco'));
  });

  it('um dia sem check-in quebra a sequência', () => {
    const anteriores = [checkin(17, { cansaco: 'forte' }), checkin(18, { cansaco: 'forte' })];
    assert.deepEqual(avaliarCheckin(checkin(20, { cansaco: 'forte' }), anteriores, leucemia), []);
  });

  it('falta de apetite ou náusea por 2 dias é amarelo', () => {
    const alertas = avaliarCheckin(checkin(20, { nausea: true }), [checkin(19, { apetiteBaixo: true })], leucemia);
    assert.deepEqual(gatilhos(alertas), ['leucemia.apetite']);
    assert.equal(alertas[0].nivel, 'amarelo');
  });
});

describe('regras gerais', () => {
  it('queda, dor no peito e falta de ar são vermelhos para qualquer paciente', () => {
    const alertas = avaliarCheckin(checkin(20, { queda: true, dorNoPeito: true, faltaDeAr: true }), [], semCondicao);
    assert.equal(alertas.length, 3);
    assert.ok(alertas.every((a) => a.nivel === 'vermelho'));
  });

  it('confusão em 2 check-ins seguidos é laranja', () => {
    const alertas = avaliarCheckin(checkin(20, { confuso: true }), [checkin(19, { confuso: true })], semCondicao);
    assert.deepEqual(gatilhos(alertas), ['geral.confusao']);
  });

  it('humor baixo por 3 dias é amarelo', () => {
    const anteriores = [checkin(18, { humor: 'baixo' }), checkin(19, { humor: 'baixo' })];
    const alertas = avaliarCheckin(checkin(20, { humor: 'baixo' }), anteriores, semCondicao);
    assert.deepEqual(gatilhos(alertas), ['geral.humor_baixo']);
  });

  it('alertas saem do mais grave para o menos grave', () => {
    const anteriores = [checkin(18, { humor: 'baixo' }), checkin(19, { humor: 'baixo' })];
    const alertas = avaliarCheckin(checkin(20, { humor: 'baixo', manchas: true, febre: true }), anteriores, leucemia);
    assert.deepEqual(alertas.map((a) => a.nivel), ['vermelho', 'laranja', 'amarelo']);
  });

  it('check-in tranquilo não gera alerta', () => {
    assert.deepEqual(avaliarCheckin(checkin(20, { humor: 'bom', cansaco: 'leve' }), [], leucemia), []);
  });
});

describe('doses', () => {
  const previsto = '2026-11-20T08:00:00-03:00';
  const em = (hhmm: string) => new Date(`2026-11-20T${hhmm}:00-03:00`);
  const dose = { previstoEm: previsto, critico: false, nomeRemedio: 'Remédio A' };

  it('dentro de 30 minutos não faz nada', () => {
    assert.deepEqual(avaliarDose(dose, em('08:29')), { acao: 'nenhuma' });
  });

  it('aos 30 minutos toca o alarme de novo', () => {
    assert.deepEqual(avaliarDose(dose, em('08:30')), { acao: 'realarmar' });
  });

  it('aos 60 minutos alerta em laranja', () => {
    const r = avaliarDose(dose, em('09:00'));
    assert.equal(r.acao, 'alertar');
    if (r.acao === 'alertar') assert.equal(r.alerta.nivel, 'laranja');
  });

  it('remédio crítico perdido alerta em vermelho', () => {
    const r = avaliarDose({ ...dose, critico: true }, em('09:00'));
    if (r.acao !== 'alertar') assert.fail('deveria alertar');
    assert.equal(r.alerta.nivel, 'vermelho');
    assert.equal(r.alerta.gatilho, 'dose.critica_perdida');
  });

  it('dose confirmada nunca alerta', () => {
    assert.deepEqual(avaliarDose({ ...dose, confirmadoEm: '2026-11-20T08:05:00-03:00' }, em('12:00')), { acao: 'nenhuma' });
  });
});

describe('silêncio, check-in sem resposta, ajuda e estoque', () => {
  it('24 horas sem interação é vermelho', () => {
    const ultima = '2026-11-19T10:00:00-03:00';
    assert.equal(avaliarSilencio(ultima, new Date('2026-11-20T09:59:00-03:00')), null);
    assert.equal(avaliarSilencio(ultima, new Date('2026-11-20T10:00:00-03:00'))?.nivel, 'vermelho');
  });

  it('check-in sem resposta após 2 tentativas é laranja', () => {
    assert.equal(avaliarCheckinSemResposta(1), null);
    assert.equal(avaliarCheckinSemResposta(2)?.nivel, 'laranja');
  });

  it('botão de ajuda é sempre vermelho', () => {
    assert.equal(pedidoDeAjuda().nivel, 'vermelho');
    assert.match(pedidoDeAjuda('caí no banheiro').motivo, /caí no banheiro/);
  });

  it('estoque para menos de 5 dias é amarelo', () => {
    assert.equal(avaliarEstoque('Remédio A', 10, 2), null);
    assert.equal(avaliarEstoque('Remédio A', 9, 2)?.nivel, 'amarelo');
  });
});

describe('datas no fuso de Brasília', () => {
  it('check-in às 23h30 de Brasília conta no próprio dia', () => {
    assert.equal(dataLocal('2026-11-20T23:30:00-03:00'), '2026-11-20');
    assert.equal(dataLocal('2026-11-21T02:30:00Z'), '2026-11-20');
  });

  it('usa só o check-in mais recente de cada dia', () => {
    const atual = checkin(20, { humor: 'baixo' });
    const anteriores = [
      { feitoEm: dia(19, '08:00'), humor: 'baixo' as const },
      { feitoEm: dia(19, '20:00'), humor: 'bom' as const },
    ];
    assert.equal(diasSeguidos(atual, anteriores, (c) => c.humor === 'baixo'), 1);
  });
});

describe('não entendeu três vezes seguidas', () => {
  it('alerta em laranja na terceira vez, uma vez só', () => {
    assert.equal(avaliarNaoEntendeu(2), null);
    assert.equal(avaliarNaoEntendeu(3)?.nivel, 'laranja');
    assert.equal(avaliarNaoEntendeu(3)?.gatilho, 'geral.nao_entendeu');
    assert.equal(avaliarNaoEntendeu(4), null);
  });
});

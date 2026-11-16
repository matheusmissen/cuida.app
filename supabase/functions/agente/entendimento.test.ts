import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { contarNaoEntendeu, pediuParaRepetir } from './entendimento.ts';
import { RESPOSTA_SEGURA } from './revisao.ts';

describe('não entendeu', () => {
  it('reconhece pedidos de repetição', () => {
    assert.ok(pediuParaRepetir('Desculpe, não consegui entender agora. A senhora pode repetir?'));
    assert.ok(pediuParaRepetir('Não ouvi direito, dona Maria. Fala de novo?'));
    assert.ok(!pediuParaRepetir('Que bom! A senhora dormiu bem?'));
    assert.ok(!pediuParaRepetir(RESPOSTA_SEGURA));
  });

  it('conta só os pedidos seguidos, ignorando as falas do idoso', () => {
    const historico = [
      { papel: 'lia' as const, texto: 'Bom dia! Como a senhora dormiu?' },
      { papel: 'idoso' as const, texto: 'mmm' },
      { papel: 'lia' as const, texto: 'Não entendi, pode repetir?' },
      { papel: 'idoso' as const, texto: 'aaa' },
      { papel: 'lia' as const, texto: 'Não ouvi direito. Fala de novo?' },
      { papel: 'idoso' as const, texto: '...' },
    ];
    assert.equal(contarNaoEntendeu(historico, 'Desculpe, pode repetir de outro jeito?'), 3);
  });

  it('zera quando a Lia entendeu', () => {
    assert.equal(contarNaoEntendeu([{ papel: 'lia', texto: 'Não entendi, pode repetir?' }], 'Entendi! Vou avisar o Lucas.'), 0);
  });

  it('primeira vez conta 1', () => {
    assert.equal(contarNaoEntendeu([], 'Não entendi, pode repetir?'), 1);
  });
});

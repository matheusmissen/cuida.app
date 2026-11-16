import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pacientesEmSilencio } from './silencio.ts';

const agora = new Date('2026-11-20T10:00:00-03:00');

describe('silêncio de 24 h', () => {
  it('alerta quem está sem interagir há 24 h ou mais', () => {
    const r = pacientesEmSilencio(
      [
        { id: 'parada', ultimaInteracaoEm: '2026-11-19T09:00:00-03:00' },
        { id: 'ativa', ultimaInteracaoEm: '2026-11-20T08:00:00-03:00' },
      ],
      new Map(),
      agora,
    );
    assert.deepEqual(r.map((x) => x.pacienteId), ['parada']);
    assert.equal(r[0].alerta.nivel, 'vermelho');
    assert.equal(r[0].alerta.gatilho, 'geral.silencio_24h');
  });

  it('não repete o alerta se já avisou depois da última interação', () => {
    const r = pacientesEmSilencio(
      [{ id: 'parada', ultimaInteracaoEm: '2026-11-19T09:00:00-03:00' }],
      new Map([['parada', '2026-11-20T09:05:00-03:00']]),
      agora,
    );
    assert.deepEqual(r, []);
  });

  it('avisa de novo se voltou a usar e parou outra vez', () => {
    const r = pacientesEmSilencio(
      [{ id: 'parada', ultimaInteracaoEm: '2026-11-19T09:00:00-03:00' }],
      new Map([['parada', '2026-11-17T09:00:00-03:00']]),
      agora,
    );
    assert.equal(r.length, 1);
  });

  it('ignora aparelho que nunca interagiu', () => {
    assert.deepEqual(pacientesEmSilencio([{ id: 'novo', ultimaInteracaoEm: null }], new Map(), agora), []);
  });
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { consentimentoDoPaciente, FINALIDADES, podeContinuar, SEM_ESCOLHAS } from '../src/consentimento.ts';

test('as 3 finalidades do PRD, cada uma com título e explicação curta', () => {
  assert.deepEqual(FINALIDADES.map((f) => f.codigo), ['registro', 'familia', 'lia']);
  for (const f of FINALIDADES) {
    assert.ok(f.titulo.length > 0 && f.texto.length > 0);
    assert.ok(f.texto.length <= 160, `texto curto: ${f.codigo}`);
  }
  assert.match(FINALIDADES[2].texto, /inteligência artificial/);
});

test('nada vem marcado: o idoso escolhe cada uma', () => {
  assert.deepEqual(SEM_ESCOLHAS, { registro: false, familia: false, lia: false });
});

test('só continua com "guardar"; "família" e "Lia" são opcionais', () => {
  assert.equal(podeContinuar({ registro: false, familia: true, lia: true }), false);
  assert.equal(podeContinuar({ registro: true, familia: false, lia: false }), true);
});

test('lê as respostas guardadas no paciente', () => {
  const c = consentimentoDoPaciente({
    consente_registro_em: '2026-11-20T12:00:00Z',
    consente_familia_em: null,
    consente_lia_em: '2026-11-20T12:00:00Z',
    consentimento_respondido_em: '2026-11-20T12:00:00Z',
  });
  assert.equal(c.respondido, true);
  assert.deepEqual(c.escolhas, { registro: true, familia: false, lia: true });
  assert.equal(consentimentoDoPaciente({}).respondido, false);
});

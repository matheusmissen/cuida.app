import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  adiar,
  caminhoDaFotoRemedio,
  CORES_COMPRIMIDO,
  descricaoDoComprimido,
  estaAdiada,
  FORMATOS_COMPRIMIDO,
} from '../src/comprimido.ts';

test('descrição para a tela e para a voz', () => {
  assert.equal(descricaoDoComprimido('branco', 'redondo'), 'Comprimido redondo branco');
  assert.equal(descricaoDoComprimido('azul', 'capsula'), 'Cápsula azul');
  assert.equal(descricaoDoComprimido('amarelo', 'gotas'), 'Gotas');
  assert.equal(descricaoDoComprimido('rosa', null), 'Comprimido rosa');
  assert.equal(descricaoDoComprimido(null, 'oval'), 'Comprimido comprido');
  assert.equal(descricaoDoComprimido(null, null), null);
  assert.equal(descricaoDoComprimido('roxo-neon', 'outro'), null);
});

test('os códigos são os mesmos da migration', () => {
  const sql = readFileSync(new URL('../../../supabase/migrations/20261130160000_hora_do_remedio.sql', import.meta.url), 'utf8');
  for (const c of CORES_COMPRIMIDO) assert.ok(sql.includes(`'${c.codigo}'`), `cor ${c.codigo}`);
  for (const f of FORMATOS_COMPRIMIDO) assert.ok(sql.includes(`'${f.codigo}'`), `formato ${f.codigo}`);
});

test('a foto fica na pasta do paciente', () => {
  assert.equal(caminhoDaFotoRemedio('pac-1', 'image/png', 'x'), 'pac-1/caixa-x.png');
  assert.equal(caminhoDaFotoRemedio('pac-1', 'image/jpeg', 'x'), 'pac-1/caixa-x.jpg');
});

test('"Me lembre daqui a 10 minutos": esconde por 10 minutos e depois volta', () => {
  const agora = new Date('2026-11-20T11:00:00Z');
  const a = adiar({}, 'dose-1', agora);
  assert.equal(estaAdiada(a, 'dose-1', new Date('2026-11-20T11:09:59Z')), true);
  assert.equal(estaAdiada(a, 'dose-1', new Date('2026-11-20T11:10:00Z')), false);
  assert.equal(estaAdiada(a, 'outra', agora), false);
  // Adiar de novo limpa os vencidos.
  const b = adiar({ velha: '2026-11-20T10:00:00Z' }, 'dose-2', agora);
  assert.deepEqual(Object.keys(b), ['dose-2']);
});

test('como a Lia fala o formato', async () => {
  const { comoFalarOComprimido } = await import('../src/comprimido.ts');
  assert.equal(comoFalarOComprimido('branco', 'redondo'), 'o comprimido redondo branco');
  assert.equal(comoFalarOComprimido('azul', 'capsula'), 'a cápsula azul');
  assert.equal(comoFalarOComprimido(null, 'gotas'), 'em gotas');
  assert.equal(comoFalarOComprimido('rosa', 'liquido'), 'o xarope');
  assert.equal(comoFalarOComprimido(null, null), null);
});

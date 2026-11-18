// Rostinhos do check-in: quem abre a conversa com a Lia e quando a família é avisada.
// A função do banco `registrar_rostinho` grava o alerta; este teste garante que ela usa
// o mesmo nível, gatilho e motivo de avaliarRostinho(), para os dois nunca divergirem.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { avaliarRostinho, precisaConversar, type NivelCheckin } from '../src/index.ts';

const NIVEIS: NivelCheckin[] = [1, 2, 3, 4, 5, 6];

test('a Lia entra na conversa só nos 3 níveis mais baixos', () => {
  assert.deepEqual(NIVEIS.filter(precisaConversar), [4, 5, 6]);
});

test('só "Muito mal" avisa a família na hora, como alerta laranja', () => {
  for (const n of [1, 2, 3, 4, 5] as NivelCheckin[]) assert.equal(avaliarRostinho(n), null);
  const alerta = avaliarRostinho(6);
  assert.equal(alerta?.nivel, 'laranja');
  assert.equal(alerta?.gatilho, 'geral.checkin_muito_mal');
});

test('registrar_rostinho() no banco grava o mesmo alerta que avaliarRostinho(6)', () => {
  const migration = readFileSync(
    new URL('../../../supabase/migrations/20261130140000_checkin_rostinhos.sql', import.meta.url),
    'utf8',
  );
  const regra = avaliarRostinho(6)!;
  const sql = (texto: string) => `'${texto.replaceAll("'", "''")}'`;
  assert.ok(migration.includes(sql(regra.gatilho)), `gatilho ${regra.gatilho} na migration`);
  assert.ok(migration.includes(sql(regra.nivel)), `nível ${regra.nivel} na migration`);
  assert.ok(migration.includes(sql(regra.motivo)), `motivo "${regra.motivo}" na migration`);
  assert.ok(migration.includes('p_nivel = 6'), 'só o nível 6 cria o alerta');
});

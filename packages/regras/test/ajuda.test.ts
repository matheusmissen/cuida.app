// O botão "Preciso de ajuda" grava o alerta pela função do banco `pedir_ajuda()` (para funcionar sem a IA
// e sem Edge Function). Este teste garante que a função do banco usa o mesmo nível, gatilho e motivo
// da regra `pedidoDeAjuda()`, para que as duas nunca divirjam.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pedidoDeAjuda } from '../src/index.ts';

const migration = readFileSync(
  new URL('../../../supabase/migrations/20261124120000_pedido_de_ajuda.sql', import.meta.url),
  'utf8',
);

test('pedir_ajuda() no banco grava o mesmo alerta que pedidoDeAjuda()', () => {
  const regra = pedidoDeAjuda();
  const sql = (texto: string) => `'${texto.replaceAll("'", "''")}'`;
  assert.ok(migration.includes(sql(regra.gatilho)), `gatilho ${regra.gatilho} na migration`);
  assert.ok(migration.includes(sql(regra.nivel)), `nível ${regra.nivel} na migration`);
  assert.ok(migration.includes(sql(regra.motivo)), `motivo "${regra.motivo}" na migration`);
});

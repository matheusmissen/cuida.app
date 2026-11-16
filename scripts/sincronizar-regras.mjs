// Copia o motor de regras (packages/regras/src) para supabase/functions/_shared/regras.
// Motivo: as Edge Functions são publicadas só com o conteúdo de supabase/functions.
// A fonte da verdade é packages/regras; nunca edite a cópia.
//
// Uso:  node scripts/sincronizar-regras.mjs          (copia)
//       node scripts/sincronizar-regras.mjs --checar (falha se a cópia estiver desatualizada)

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const origem = join(raiz, 'packages/regras/src');
const destino = join(raiz, 'supabase/functions/_shared/regras');
const cabecalho = '// ARQUIVO GERADO por scripts/sincronizar-regras.mjs a partir de packages/regras/src. NÃO EDITE.\n';
const checar = process.argv.includes('--checar');

mkdirSync(destino, { recursive: true });
let desatualizados = [];
for (const nome of readdirSync(origem).filter((n) => n.endsWith('.ts'))) {
  const esperado = cabecalho + readFileSync(join(origem, nome), 'utf8');
  const alvo = join(destino, nome);
  const atual = existsSync(alvo) ? readFileSync(alvo, 'utf8') : null;
  if (atual === esperado) continue;
  if (checar) desatualizados.push(nome);
  else writeFileSync(alvo, esperado);
}

if (checar && desatualizados.length > 0) {
  console.error(`Cópia das regras desatualizada: ${desatualizados.join(', ')}. Rode: node scripts/sincronizar-regras.mjs`);
  process.exit(1);
}
console.log(checar ? 'Cópia das regras em dia.' : 'Regras sincronizadas.');

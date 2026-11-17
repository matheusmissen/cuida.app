// Confere as regras de acessibilidade do design "Manhã Clara" direto em docs/design/tokens.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const tokens = JSON.parse(readFileSync(new URL('../../../docs/design/tokens.json', import.meta.url), 'utf8'));

function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

test('app do idoso: nenhum tamanho de texto abaixo de 20 pt', () => {
  for (const [nome, pt] of Object.entries(tokens.tamanhos.idoso)) assert.ok((pt as number) >= 20, `${nome} = ${pt}`);
});

test('app do idoso: alvos de toque de 64 ou mais', () => {
  for (const nome of ['idosoMinimo', 'botaoSecundarioIdoso', 'botaoPrincipalIdoso', 'tomei', 'microfone']) {
    assert.ok(tokens.alvos[nome] >= 64, `${nome} = ${tokens.alvos[nome]}`);
  }
});

test('pares de texto usados nos apps têm contraste de pelo menos 4,5:1', () => {
  const c = tokens.cores;
  const pares: [string, string, string][] = [
    ['tinta/fundo', c.tinta, c.fundo],
    ['textoSuave/fundo', c.textoSuave, c.fundo],
    ['textoSecundario/cartao', c.textoSecundario, c.cartao],
    ['sobreTinta/tinta', c.sobreTinta, c.tinta],
    ['salvia.texto/salvia.fundo', c.salvia.texto, c.salvia.fundo],
    ['salvia.texto/salvia.fundoClaro', c.salvia.texto, c.salvia.fundoClaro],
    ['lilas.texto/lilas.fundo', c.lilas.texto, c.lilas.fundo],
    ['pessego.texto/pessego.fundo', c.pessego.texto, c.pessego.fundo],
    ['alerta.texto/alerta.fundo', c.alerta.texto, c.alerta.fundo],
    ['alerta.escuro/alerta.fundo', c.alerta.escuro, c.alerta.fundo],
    ['branco/alerta.forte', c.sobreTinta, c.alerta.forte],
    ['textoSuave/superficieNeutra', c.textoSuave, c.superficieNeutra],
  ];
  for (const [nome, frente, fundo] of pares) {
    const r = contraste(frente, fundo);
    assert.ok(r >= 4.5, `${nome}: ${r.toFixed(2)}:1`);
  }
});

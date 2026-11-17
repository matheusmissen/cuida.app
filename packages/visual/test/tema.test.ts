// Confere as regras de acessibilidade de docs/design.md nos valores do tema da Variação E.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { alturas, cores, NIVEIS, paisagem, pasteis, rostinhos, tamanhos } from '../src/tema.ts';
import { chamaLia, periodoDoDia, saudacao } from '../src/periodo.ts';

function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
const minimo = (nome: string, a: string, b: string, alvo = 4.5) =>
  assert.ok(contraste(a, b) >= alvo, `${nome}: ${contraste(a, b).toFixed(2)} < ${alvo}`);

test('texto principal e secundário com contraste de 4,5:1 no fundo e nos cartões', () => {
  for (const fundo of [cores.fundo, cores.superficie]) {
    minimo('texto', cores.texto, fundo);
    minimo('textoSuave', cores.textoSuave, fundo);
    minimo('primaria (botão secundário)', cores.primaria, fundo);
  }
  minimo('branco sobre o botão principal', cores.sobrePrimaria, cores.primaria);
  minimo('texto de alerta', cores.alertaTexto, cores.alertaFundo);
  minimo('selo de alerta crítico', cores.superficie, cores.alertaForte);
});

test('pastéis: texto escuro e cor do ícone legíveis sobre o fundo do par', () => {
  for (const [nome, par] of Object.entries(pasteis)) {
    minimo(`${nome}: texto`, cores.texto, par.fundo);
    minimo(`${nome}: ícone`, par.icone, par.fundo);
  }
});

test('rostinhos: 6 níveis, rótulo escrito e rosto visível sobre o bloco', () => {
  assert.equal(NIVEIS.length, 6);
  for (const n of NIVEIS) {
    const r = rostinhos[n];
    assert.ok(r.rotulo.length > 0, `nível ${n} sem rótulo`);
    minimo(`nível ${n}: rosto`, r.rosto, r.fundo);
  }
  assert.equal(rostinhos[1].rotulo, 'Muito bem');
  assert.equal(rostinhos[6].rotulo, 'Muito mal');
});

test('paisagem: texto e botão legíveis de dia e de noite', () => {
  for (const periodo of ['dia', 'noite'] as const) {
    const c = paisagem[periodo];
    minimo(`${periodo}: texto no topo do céu`, c.texto, c.ceuTopo);
    minimo(`${periodo}: texto na base do céu`, c.texto, c.ceuBase);
    minimo(`${periodo}: botão`, c.botaoTexto, c.botaoFundo);
  }
});

test('tamanhos e alturas seguem docs/design.md', () => {
  assert.ok(tamanhos.idoso.minimo >= 17);
  assert.ok(tamanhos.idoso.texto >= 19);
  assert.ok(tamanhos.familia.minimo >= 14);
  assert.equal(alturas.botaoIdoso, 64);
  assert.ok(alturas.botaoTomei >= 88 && alturas.botaoTomei <= 90);
  assert.ok(alturas.botaoFamilia >= 56 && alturas.botaoFamilia <= 60);
  assert.ok(alturas.toqueIdoso >= 56);
  assert.ok(alturas.toqueFamilia >= 44);
});

test('as cores do tema são as mesmas de docs/design.md', () => {
  const md = readFileSync(new URL('../../../docs/design.md', import.meta.url), 'utf8').toUpperCase();
  const todas = [
    ...Object.values(cores).filter((v) => v !== '#FFFFFF'),
    ...Object.values(pasteis).flatMap((p) => Object.values(p)),
    ...NIVEIS.flatMap((n) => [rostinhos[n].fundo, rostinhos[n].borda, rostinhos[n].rosto]),
  ];
  for (const hex of todas) assert.ok(md.includes(hex), `${hex} não aparece em docs/design.md`);
});

test('dia das 6h às 18h, noite no resto', () => {
  const as = (h: number, m = 0) => new Date(2026, 10, 17, h, m);
  assert.equal(periodoDoDia(as(5, 59)), 'noite');
  assert.equal(periodoDoDia(as(6)), 'dia');
  assert.equal(periodoDoDia(as(17, 59)), 'dia');
  assert.equal(periodoDoDia(as(18)), 'noite');
  assert.equal(periodoDoDia(as(0)), 'noite');
});

test('saudação: bom dia, boa tarde e boa noite', () => {
  const as = (h: number) => new Date(2026, 10, 17, h);
  assert.equal(saudacao(as(8)), 'Bom dia');
  assert.equal(saudacao(as(12)), 'Boa tarde');
  assert.equal(saudacao(as(19)), 'Boa noite');
  assert.equal(saudacao(as(2)), 'Boa noite');
});

test('só os 3 níveis mais baixos chamam a Lia', () => {
  assert.deepEqual(NIVEIS.filter(chamaLia), [4, 5, 6]);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  codigoParaMostrar,
  lerCodigoDoConvite,
  linkDoConvite,
  mensagemDoConvite,
  nomeDoMembro,
  ordenarGrupo,
  podeMudarRemedios,
  rotuloDoPapel,
} from '../src/grupo.ts';

test('código do convite: aceita minúsculas, espaço e hífen; recusa letras que confundem', () => {
  assert.equal(lerCodigoDoConvite('k7m 4qx'), 'K7M4QX');
  assert.equal(lerCodigoDoConvite('K7M-4QX'), 'K7M4QX');
  assert.equal(lerCodigoDoConvite('K7M4Q'), null, 'curto');
  assert.equal(lerCodigoDoConvite('K7M40X'), null, 'zero não existe no alfabeto');
  assert.equal(lerCodigoDoConvite('K7MI4X'), null, 'I não existe no alfabeto');
  assert.equal(codigoParaMostrar('K7M4QX'), 'K7M 4QX');
});

test('link e mensagem do convite', () => {
  assert.equal(linkDoConvite('K7M4QX'), 'https://cuida-app-familia.vercel.app/convite?codigo=K7M4QX');
  assert.equal(linkDoConvite('K7M4QX', 'http://localhost:8081/'), 'http://localhost:8081/convite?codigo=K7M4QX');
  const m = mensagemDoConvite('Dona Maria', 'K7M4QX', linkDoConvite('K7M4QX'));
  assert.match(m, /acompanhar Dona Maria/);
  assert.match(m, /K7M 4QX/);
  assert.match(m, /7 dias/);
});

test('papéis: nomes, ordem (responsável primeiro) e quem muda remédios', () => {
  assert.equal(rotuloDoPapel('principal'), 'Responsável principal');
  assert.equal(rotuloDoPapel('apoio'), 'Acompanhante');
  assert.equal(nomeDoMembro({ nome_exibicao: '  Ana ', papel: 'apoio' }), 'Ana');
  assert.equal(nomeDoMembro({ nome_exibicao: null, papel: 'apoio' }), 'Acompanhante sem nome');
  const grupo = [
    { id: 'c', papel: 'apoio' as const, ordem_escala: 3 },
    { id: 'a', papel: 'principal' as const, ordem_escala: 1 },
    { id: 'b', papel: 'apoio' as const, ordem_escala: 2 },
  ];
  assert.deepEqual(ordenarGrupo(grupo).map((m) => m.id), ['a', 'b', 'c']);
  assert.equal(podeMudarRemedios('principal'), true);
  assert.equal(podeMudarRemedios('apoio'), false);
  assert.equal(podeMudarRemedios(null), false);
});

test('idoso tira alguém do grupo: confirmação clara e nunca deixa o grupo vazio', async () => {
  const { confirmacaoTirarDoGrupo, papelParaOIdoso } = await import('../src/grupo.ts');
  const lucas = { usuario_id: 'l', nome: 'Lucas', papel: 'principal' as const };
  const ana = { usuario_id: 'a', nome: 'Ana', papel: 'apoio' as const };
  assert.equal(papelParaOIdoso('principal'), 'Responsável pelos seus remédios');
  const tirarAna = confirmacaoTirarDoGrupo(ana, [lucas, ana]);
  assert.equal(tirarAna.podeTirar, true);
  assert.equal(tirarAna.pergunta, 'Tirar Ana do grupo?');
  const tirarLucas = confirmacaoTirarDoGrupo(lucas, [lucas, ana]);
  assert.match(tirarLucas.detalhe, /Ana passa a cuidar dos seus remédios/);
  assert.equal(confirmacaoTirarDoGrupo(lucas, [lucas]).podeTirar, false);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ativarNotificacoes,
  CHAVE_PUBLICA_VAPID,
  chaveParaBytes,
  dadosDaInscricao,
  ehIphone,
  estadoNotificacoes,
  lerSituacao,
  textoDasNotificacoes,
  type NavegadorNotificacoes,
} from '../src/notificacoes.ts';

const base = { temPush: true, permissao: 'default' as const, iphone: false, instalado: false, inscrito: false };

test('estado: iPhone no Safari precisa instalar primeiro (mesmo sem push à vista)', () => {
  assert.equal(estadoNotificacoes({ ...base, iphone: true, temPush: false }), 'instalar_primeiro');
  assert.equal(estadoNotificacoes({ ...base, iphone: true, instalado: true }), 'pedir');
});

test('estado: sem push, bloqueadas, pedir e ativas', () => {
  assert.equal(estadoNotificacoes({ ...base, temPush: false }), 'sem_suporte');
  assert.equal(estadoNotificacoes({ ...base, permissao: 'denied' }), 'bloqueadas');
  assert.equal(estadoNotificacoes(base), 'pedir');
  assert.equal(estadoNotificacoes({ ...base, permissao: 'granted' }), 'pedir', 'permitiu, mas não está inscrito');
  assert.equal(estadoNotificacoes({ ...base, permissao: 'granted', inscrito: true }), 'ativas');
});

test('reconhece iPhone e iPad (que se apresenta como Mac com toque)', () => {
  assert.equal(ehIphone('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)'), true);
  assert.equal(ehIphone('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5), true);
  assert.equal(ehIphone('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0), false);
  assert.equal(ehIphone('Mozilla/5.0 (Linux; Android 14; Pixel 8)'), false);
});

test('a chave pública VAPID tem 65 bytes e começa com 0x04 (P-256 sem compressão)', () => {
  const b = chaveParaBytes(CHAVE_PUBLICA_VAPID);
  assert.equal(b.length, 65);
  assert.equal(b[0], 4);
});

test('dados da inscrição: endpoint e as duas chaves do navegador', () => {
  const ass = { toJSON: () => ({ endpoint: 'https://push.exemplo/abc', keys: { p256dh: 'BPub', auth: 'seg' } }) };
  assert.deepEqual(dadosDaInscricao(ass), { endpoint: 'https://push.exemplo/abc', p256dh: 'BPub', auth: 'seg' });
  assert.throws(() => dadosDaInscricao({ toJSON: () => ({ endpoint: 'x' }) }));
});

function navegadorFalso(opcoes: { permissao?: 'default' | 'granted' | 'denied'; resposta?: 'granted' | 'denied' | 'default'; semRegistro?: boolean; jaInscrito?: boolean }) {
  let permissao = opcoes.permissao ?? 'default';
  const inscricoes: unknown[] = [];
  let atual = opcoes.jaInscrito ? { toJSON: () => ({ endpoint: 'https://push.exemplo/velho', keys: { p256dh: 'A', auth: 'B' } }) } : null;
  const nav: NavegadorNotificacoes = {
    permissao: () => permissao,
    pedirPermissao: async () => (permissao = opcoes.resposta ?? 'granted'),
    registro: async () =>
      opcoes.semRegistro
        ? null
        : {
            pushManager: {
              getSubscription: async () => atual,
              subscribe: async (o) => {
                inscricoes.push(o);
                atual = { toJSON: () => ({ endpoint: 'https://push.exemplo/novo', keys: { p256dh: 'P', auth: 'S' } }) };
                return atual;
              },
            },
          },
  };
  return { nav, inscricoes };
}

test('ativar: pede permissão, inscreve com a chave do servidor e salva', async () => {
  const { nav, inscricoes } = navegadorFalso({});
  const salvos: unknown[] = [];
  assert.equal(await ativarNotificacoes(nav, async (d) => void salvos.push(d)), 'ativas');
  assert.equal(inscricoes.length, 1);
  assert.deepEqual(salvos, [{ endpoint: 'https://push.exemplo/novo', p256dh: 'P', auth: 'S' }]);
  assert.equal(await lerSituacao(nav, false, false), 'ativas');
});

test('ativar: reaproveita a inscrição que já existe (e salva de novo, para esta conta)', async () => {
  const { nav, inscricoes } = navegadorFalso({ jaInscrito: true });
  const salvos: { endpoint: string }[] = [];
  await ativarNotificacoes(nav, async (d) => void salvos.push(d));
  assert.equal(inscricoes.length, 0);
  assert.equal(salvos[0].endpoint, 'https://push.exemplo/velho');
});

test('ativar: recusa vira bloqueadas e nada é salvo; sem service worker, sem suporte', async () => {
  const salvos: unknown[] = [];
  assert.equal(await ativarNotificacoes(navegadorFalso({ resposta: 'denied' }).nav, async (d) => void salvos.push(d)), 'bloqueadas');
  assert.equal(await ativarNotificacoes(navegadorFalso({ semRegistro: true }).nav, async (d) => void salvos.push(d)), 'sem_suporte');
  assert.equal(salvos.length, 0);
});

test('situação sem pedir nada: sem navegador ou sem service worker = sem suporte', async () => {
  assert.equal(await lerSituacao(null, false, false), 'sem_suporte');
  assert.equal(await lerSituacao(navegadorFalso({ semRegistro: true }).nav, false, false), 'sem_suporte');
  assert.equal(await lerSituacao(navegadorFalso({}).nav, false, false), 'pedir');
  assert.equal(await lerSituacao(navegadorFalso({ permissao: 'denied' }).nav, false, false), 'bloqueadas');
});

test('textos em português para cada situação', () => {
  assert.match(textoDasNotificacoes('instalar_primeiro', 'idoso'), /Tela de Início/);
  assert.match(textoDasNotificacoes('pedir', 'idoso'), /remédio/);
  assert.match(textoDasNotificacoes('pedir', 'familia'), /alertas/);
  assert.match(textoDasNotificacoes('bloqueadas', 'familia'), /ajustes do celular/);
});

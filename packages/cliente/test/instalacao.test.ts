import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerCodigoDeAcesso, mensagemDeInstalacao, precisaInstalar, reconhecerNavegador } from '../src/instalacao.ts';

const UA = {
  safariIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  whatsappIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WhatsApp/24.10.75',
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  webviewAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-A145M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36',
  instagramAndroid: 'Mozilla/5.0 (Linux; Android 13; moto g) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36 Instagram 350.0.0',
  chromeComputador: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  ipadComoMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
};

test('reconhece iPhone, Android e computador', () => {
  assert.deepEqual(reconhecerNavegador(UA.safariIphone), { sistema: 'ios', dentroDeApp: false, nomeDoApp: null });
  assert.deepEqual(reconhecerNavegador(UA.chromeAndroid), { sistema: 'android', dentroDeApp: false, nomeDoApp: null });
  assert.equal(reconhecerNavegador(UA.chromeComputador).sistema, 'outro');
  assert.equal(reconhecerNavegador(UA.ipadComoMac, 5).sistema, 'ios');
  assert.equal(reconhecerNavegador(UA.ipadComoMac, 0).sistema, 'outro');
});

test('reconhece link aberto dentro do WhatsApp, Instagram e navegador embutido do Android', () => {
  assert.deepEqual(reconhecerNavegador(UA.whatsappIphone), { sistema: 'ios', dentroDeApp: true, nomeDoApp: 'WhatsApp' });
  assert.equal(reconhecerNavegador(UA.instagramAndroid).nomeDoApp, 'Instagram');
  assert.deepEqual(reconhecerNavegador(UA.webviewAndroid), { sistema: 'android', dentroDeApp: true, nomeDoApp: null });
});

test('a tela de instalar aparece só no celular ainda não instalado (no computador, não)', () => {
  assert.equal(precisaInstalar(reconhecerNavegador(UA.safariIphone), false, false), true);
  assert.equal(precisaInstalar(reconhecerNavegador(UA.safariIphone), true, false), false, 'já instalado');
  assert.equal(precisaInstalar(reconhecerNavegador(UA.safariIphone), false, true), false, 'escolheu continuar sem instalar');
  assert.equal(precisaInstalar(reconhecerNavegador(UA.chromeComputador), false, false), false, 'computador dos jurados');
  assert.equal(precisaInstalar(reconhecerNavegador(UA.whatsappIphone), false, false), true);
});

test('código de acesso: 4 números, com ou sem espaços', () => {
  assert.equal(lerCodigoDeAcesso('4821'), '4821');
  assert.equal(lerCodigoDeAcesso(' 4 8 2-1 '), '4821');
  assert.equal(lerCodigoDeAcesso('482'), null);
  assert.equal(lerCodigoDeAcesso('48211'), null);
  assert.equal(lerCodigoDeAcesso('abcd'), null);
});

test('mensagem com o link de instalação', () => {
  const m = mensagemDeInstalacao('Dona Maria');
  assert.match(m, /Oi, Dona Maria!/);
  assert.match(m, /https:\/\/cuida-app-idoso\.vercel\.app\//);
  assert.match(m, /Safari/);
  assert.match(m, /4 números/);
});

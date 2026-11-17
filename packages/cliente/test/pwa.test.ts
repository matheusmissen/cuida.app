// PWA (docs/PRD.md, seção 9): registro do service worker, "está instalado?" e os arquivos de cada app.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { estaInstalado, registrarServiceWorker } from '../src/pwa.ts';

const raiz = new URL('../../../', import.meta.url);
const ler = (caminho: string) => readFileSync(new URL(caminho, raiz));
const APPS = ['idoso', 'familia'] as const;

/** Largura e altura de um PNG (cabeçalho IHDR). */
function tamanhoPng(arquivo: Buffer): [number, number] {
  assert.equal(arquivo.subarray(1, 4).toString('ascii'), 'PNG');
  return [arquivo.readUInt32BE(16), arquivo.readUInt32BE(20)];
}

test('registra /sw.js só em produção e só com service worker', async () => {
  const registros: string[] = [];
  const navegador = { serviceWorker: { register: async (url: string) => void registros.push(url) } };
  assert.equal(registrarServiceWorker(navegador, false), false);
  assert.equal(registrarServiceWorker({}, true), false);
  assert.equal(registrarServiceWorker(undefined, true), false);
  assert.equal(registrarServiceWorker(navegador, true), true);
  assert.deepEqual(registros, ['/sw.js']);
});

test('falha no registro não derruba o app', async () => {
  let avisado: unknown = null;
  const navegador = { serviceWorker: { register: () => Promise.reject(new Error('sem https')) } };
  registrarServiceWorker(navegador, true, (e) => (avisado = e));
  await new Promise((r) => setTimeout(r, 0));
  assert.match(String(avisado), /sem https/);
});

test('instalado: ícone do iPhone (standalone) ou display-mode standalone', () => {
  const media = (sim: string) => ({ matchMedia: (c: string) => ({ matches: c === sim }) });
  assert.equal(estaInstalado(undefined, { standalone: true }), true);
  assert.equal(estaInstalado(media('(display-mode: standalone)'), {}), true);
  assert.equal(estaInstalado(media('(display-mode: browser)'), {}), false);
  assert.equal(estaInstalado(undefined, undefined), false);
});

for (const app of APPS) {
  test(`${app}: manifest instalável (nome, standalone, ícones 192/512 e maskable)`, () => {
    const m = JSON.parse(ler(`apps/${app}/public/manifest.webmanifest`).toString('utf8'));
    assert.ok(m.name && m.short_name);
    assert.equal(m.lang, 'pt-BR');
    assert.equal(m.display, 'standalone');
    assert.equal(m.start_url, '/');
    assert.equal(m.scope, '/');
    assert.match(m.background_color, /^#[0-9A-F]{6}$/i);
    for (const icone of m.icons) {
      assert.ok(existsSync(new URL(`apps/${app}/public${icone.src}`, raiz)), `${icone.src} não existe`);
      if (icone.type === 'image/png') {
        const [l, a] = tamanhoPng(ler(`apps/${app}/public${icone.src}`));
        assert.equal(`${l}x${a}`, icone.sizes, icone.src);
      }
    }
    const pngs = m.icons.filter((i: { type: string }) => i.type === 'image/png');
    assert.ok(pngs.some((i: { sizes: string }) => i.sizes === '192x192'));
    assert.ok(pngs.some((i: { sizes: string; purpose: string }) => i.sizes === '512x512' && i.purpose === 'any'));
    assert.ok(pngs.some((i: { purpose: string }) => i.purpose === 'maskable'));
  });

  test(`${app}: página liga o manifest e os ajustes do iPhone`, () => {
    const html = ler(`apps/${app}/public/index.html`).toString('utf8');
    for (const trecho of [
      'rel="manifest" href="/manifest.webmanifest"',
      'name="apple-mobile-web-app-capable" content="yes"',
      'name="apple-mobile-web-app-title"',
      'rel="apple-touch-icon" href="/icones/apple-touch-icon.png"',
      'name="theme-color"',
      '%LANG_ISO_CODE%',
      '%WEB_TITLE%',
      '<div id="root"></div>',
    ]) {
      assert.ok(html.includes(trecho), `falta: ${trecho}`);
    }
    assert.deepEqual(tamanhoPng(ler(`apps/${app}/public/icones/apple-touch-icon.png`)), [180, 180]);
  });

  test(`${app}: service worker guarda só arquivos que existem e nunca outros sites`, () => {
    const sw = ler(`apps/${app}/public/sw.js`).toString('utf8');
    const casca = JSON.parse(sw.match(/const CASCA = (\[[^\]]*\])/)![1].replace(/'/g, '"'));
    for (const caminho of casca) {
      if (caminho === '/') continue; // a página vem do build
      assert.ok(existsSync(new URL(`apps/${app}/public${caminho}`, raiz)), `${caminho} não existe`);
    }
    assert.ok(sw.includes('url.origin !== self.location.origin'), 'deve ignorar outros sites');
  });

  test(`${app}: a Vercel serve o service worker sem cache`, () => {
    const v = JSON.parse(ler(`apps/${app}/vercel.json`).toString('utf8'));
    const sw = v.headers.find((h: { source: string }) => h.source === '/sw.js');
    assert.ok(sw.headers.some((h: { key: string; value: string }) => h.key === 'Cache-Control' && h.value.includes('no-cache')));
  });
}

test('o service worker é o mesmo nos dois apps', () => {
  assert.equal(ler('apps/idoso/public/sw.js').toString(), ler('apps/familia/public/sw.js').toString());
});

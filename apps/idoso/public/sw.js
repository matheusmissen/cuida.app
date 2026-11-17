// Service worker do Cuida (PWA, docs/PRD.md seção 9). O mesmo arquivo nos dois apps:
// apps/idoso/public/sw.js e apps/familia/public/sw.js (um teste confere que são iguais).
//
// O que faz:
// - Guarda a "casca" do app (página, manifest e ícones) para abrir mesmo sem internet.
// - Páginas: tenta a rede primeiro; sem internet, mostra a casca guardada.
// - Arquivos do build (/_expo/static/ e /assets/, com nome que muda a cada versão): guarda na primeira vez.
// - Nunca guarda chamadas a outros sites (Supabase, API da Lia): dados de saúde não ficam no cache.
// As notificações (web push) entram na próxima etapa, neste mesmo arquivo.

const VERSAO = 'cuida-v1';
const CASCA = ['/', '/manifest.webmanifest', '/icones/icone-192.png', '/icones/icone-512.png'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(VERSAO)
      .then((cache) => cache.addAll(CASCA))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

function arquivoDoBuild(url) {
  return url.pathname.startsWith('/_expo/static/') || url.pathname.startsWith('/assets/');
}

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return; // Supabase, Lia etc.: sempre direto na rede

  if (pedido.mode === 'navigate') {
    evento.respondWith(
      fetch(pedido)
        .then((resposta) => {
          const copia = resposta.clone();
          if (resposta.ok) caches.open(VERSAO).then((cache) => cache.put('/', copia));
          return resposta;
        })
        .catch(() => caches.match('/').then((r) => r || Response.error())),
    );
    return;
  }

  if (arquivoDoBuild(url)) {
    evento.respondWith(
      caches.match(pedido).then(
        (guardado) =>
          guardado ||
          fetch(pedido).then((resposta) => {
            if (resposta.ok) {
              const copia = resposta.clone();
              caches.open(VERSAO).then((cache) => cache.put(pedido, copia));
            }
            return resposta;
          }),
      ),
    );
  }
});

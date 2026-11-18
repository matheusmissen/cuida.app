// Service worker do Cuida (PWA, docs/PRD.md seção 9). O mesmo arquivo nos dois apps:
// apps/idoso/public/sw.js e apps/familia/public/sw.js (um teste confere que são iguais).
//
// O que faz:
// - Guarda a "casca" do app (página, manifest e ícones) para abrir mesmo sem internet.
// - Páginas: tenta a rede primeiro; sem internet, mostra a casca guardada.
// - Arquivos do build (/_expo/static/ e /assets/, com nome que muda a cada versão): guarda na primeira vez.
// - Nunca guarda chamadas a outros sites (Supabase, API da Lia): dados de saúde não ficam no cache.
// - Mostra as notificações (web push) mandadas pelo servidor e abre o app ao tocar nelas.

const VERSAO = 'cuida-v2';
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

// Notificações (web push). O servidor manda { titulo, corpo, url, etiqueta, urgente }
// (supabase/functions/_shared/webpush.ts, Notificacao), cifrado só para este navegador.
self.addEventListener('push', (evento) => {
  let dados = {};
  try {
    dados = evento.data ? evento.data.json() : {};
  } catch {
    dados = { corpo: evento.data ? evento.data.text() : '' };
  }
  const titulo = dados.titulo || 'Cuida';
  evento.waitUntil(
    self.registration.showNotification(titulo, {
      body: dados.corpo || '',
      icon: '/icones/icone-192.png',
      badge: '/icones/icone-192.png',
      tag: dados.etiqueta || undefined,
      renotify: Boolean(dados.etiqueta),
      // Alerta crítico ou emergência: fica na tela até a pessoa tocar.
      requireInteraction: Boolean(dados.urgente),
      lang: 'pt-BR',
      data: { url: dados.url || '/' },
    }),
  );
});

// Toque na notificação: volta para uma janela aberta do app ou abre uma nova.
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const destino = new URL((evento.notification.data && evento.notification.data.url) || '/', self.location.origin).href;
  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if (new URL(janela.url).origin === self.location.origin && 'focus' in janela) {
          if ('navigate' in janela && janela.url !== destino) janela.navigate(destino).catch(() => {});
          return janela.focus();
        }
      }
      return self.clients.openWindow(destino);
    }),
  );
});

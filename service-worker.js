/* MycoNatura – Service Worker
   Speichert alle Dateien der App beim ersten Laden und liefert sie danach auch offline aus.
   Strategie: "Stale-While-Revalidate" – sofort aus dem Cache, im Hintergrund aktualisieren.
   Bei Änderungen an Dateien: CACHE_VERSION erhöhen. */

const APP_VERSION = '1.5.1';
const PHOTOS_REV = '202610290625'; // wird vom Foto-Workflow automatisch geändert
const CACHE_VERSION = `myconatura-v${APP_VERSION}-${PHOTOS_REV}`;

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './src/style.css',
  './src/js/app.js',
  './src/js/util.js',
  './src/js/vocab.js',
  './src/js/store.js',
  './src/js/search.js',
  './src/js/identify.js',
  './src/js/illustration.js',
  './src/data/mushrooms.json',
  './src/data/photos.json',
  './src/data/wildnis.json',
  './src/js/config.js',
  './src/js/assistant.js',
  './assets/icons/logo.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(async (cache) => {
        await cache.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' })));
        // Alle Pilzfotos für die Offline-Nutzung vorab speichern (Fehler einzelner Fotos sind unkritisch)
        try {
          const res = await cache.match('./src/data/photos.json');
          const list = Object.values((await res.json()).photos || {}).map((p) => './' + p.src);
          await Promise.all(list.map((u) => cache.add(new Request(u, { cache: 'reload' })).catch(() => null)));
        } catch (e) { /* keine Fotos vorhanden */ }
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('myconatura-') && k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // fremde Anfragen nicht anfassen

  // Seitenaufrufe: App-Hülle aus dem Cache (funktioniert offline)
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cached) => {
        const network = fetch(req).then((res) => {
          if (res.ok) caches.open(CACHE_VERSION).then((c) => c.put('./index.html', res.clone()));
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached || new Response('Offline – diese Datei ist nicht im Cache.', {
        status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }));
      return cached || network;
    })
  );
});

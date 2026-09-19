// Keeps the app available offline. Serves the cached shell at once and refreshes it in the background,
// so changes show up the next time the app opens. Bump VERSION when the file list changes.

const VERSION = 'kata-v1';
const SHELL = [
  './', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/screens.js', 'js/store.js', 'js/logic.js', 'js/idb.js', 'js/ui.js', 'js/demo.js',
  'curricula/drawabox.json',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    caches.open(VERSION).then(async cache => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req).then(res => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || network;
    }),
  );
});

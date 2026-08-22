/* NEXUS-7 :: service worker -- gioco disponibile offline dopo la prima apertura. */
var CACHE = 'nexus7-v2';
var FILES = [
  './', './index.html', './css/style.css', './icon.svg', './manifest.webmanifest',
  './js/data.js', './js/story.js', './js/tutorial.js', './js/engine.js',
  './js/render.js', './js/ui.js', './js/main.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () {
    return self.skipWaiting();
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (k) {
    return Promise.all(k.filter(function (n) { return n !== CACHE; }).map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

/* Rete-prima con ricaduta sulla cache: online prende gli aggiornamenti, offline gioca lo stesso. */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function (r) {
      var copia = r.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copia); });
      return r;
    }).catch(function () {
      return caches.match(e.request).then(function (r) { return r || caches.match('./index.html'); });
    })
  );
});

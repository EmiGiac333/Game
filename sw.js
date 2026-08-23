/* NEXUS-7 :: service worker -- gioco disponibile offline dopo la prima apertura. */
var CACHE = 'nexus7-v4';
var FILES = [
  './', './index.html', './css/style.css', './icon.svg', './manifest.webmanifest',
  './js/data.js', './js/sprites.js', './js/story.js', './js/tutorial.js',
  './js/spedizioni.js', './js/battaglia.js',
  './js/engine.js', './js/render.js', './js/ui.js', './js/main.js',
  './sprites/elenco.json'
];

self.addEventListener('install', function (e) {
  /* Oltre al codice, precarico tutti gli sprite elencati da elenco.json,
     cosi' il gioco resta giocabile offline anche alla prima apertura. */
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(FILES).then(function () {
        return fetch('./sprites/elenco.json')
          .then(function (r) { return r.json(); })
          .then(function (lista) {
            return c.addAll(lista.map(function (f) { return './sprites/' + f; }));
          })
          .catch(function () { /* gli sprite verranno messi in cache al primo uso */ });
      });
    }).then(function () { return self.skipWaiting(); })
  );
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

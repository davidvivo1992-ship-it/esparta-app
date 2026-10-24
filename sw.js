// Metabolisme Esparta · service worker
// Nomes cacheja l'embolcall de l'aplicacio. Les dades sempre van a la xarxa:
// una fitxa de salut antiga es pitjor que cap fitxa.
var CACHE = 'esparta-v20';
var FITXERS = [
  './', './index.html', './manifest.json', './logo.png',
  './js/core.js?v=20', './js/offline.js?v=20',
  './js/shell.js?v=20', './js/cronometre.js?v=20', './js/avui.js?v=20',
  './js/agenda.js?v=20', './js/nutricio.js?v=20',
  './js/progres.js?v=20', './js/missatges.js?v=20', './js/avisos.js?v=20',
  './js/perfil.js?v=20'
];
// La llibreria de connexio ve d'un CDN: es cacheja a part, perque si falla
// no ha de tombar la instal·lacio sencera del service worker.
var CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    c.add(CDN).catch(function(){});
    return c.addAll(FITXERS);
  }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(claus){
    return Promise.all(claus.filter(function(k){ return k !== CACHE; })
      .map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener('fetch', function(e){
  var u = e.request.url;
  if (u.indexOf('supabase.co') !== -1 || u.indexOf('fonts.g') !== -1) return;
  if (e.request.method !== 'GET') return;
  // Sempre es demana a la xarxa saltant-se la cau del navegador: si no,
  // el mobil es queda amb la versio antiga de l'app despres d'un desplegament.
  var peticio = new Request(e.request.url, { cache:'no-store' });
  e.respondWith(
    fetch(peticio).then(function(r){
      var copia = r.clone();
      caches.open(CACHE).then(function(c){ c.put(e.request, copia); }).catch(function(){});
      return r;
    }).catch(function(){ return caches.match(e.request); })
  );
});

// ── Avisos push ────────────────────────────────────────────────────
self.addEventListener('push', function(e){
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch(err){ d = { titol:'Metabolisme Espartà' }; }
  e.waitUntil(self.registration.showNotification(d.titol || 'Metabolisme Espartà', {
    body: d.cos || '',
    icon: './icona-192.png',
    badge: './icona-192.png',
    tag: d.ruta || 'esparta',
    data: { ruta: d.ruta || 'avui' }
  }));
});

self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var ruta = (e.notification.data && e.notification.data.ruta) || 'avui';
  e.waitUntil(self.clients.matchAll({ type:'window', includeUncontrolled:true })
    .then(function(finestres){
      for (var i = 0; i < finestres.length; i++){
        var f = finestres[i];
        if (f.url.indexOf(self.registration.scope) === 0){
          f.navigate(self.registration.scope + '#' + ruta).catch(function(){});
          return f.focus();
        }
      }
      return self.clients.openWindow('./#' + ruta);
    }));
});

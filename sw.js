const CACHE = 'taller-diaz-v3';
const ASSETS = ['/sistema.html', '/manifest.json', '/logo.jpeg', '/logo-negro.jpg'];

// Archivos que siempre deben ir a la red primero
const NETWORK_FIRST = ['/sistema.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // No interceptar Firebase ni Google Scripts
  if (url.includes('firestore.googleapis.com') ||
      url.includes('firebase') ||
      url.includes('script.google.com')) return;

  if (!url.startsWith(self.location.origin)) return;

  const path = new URL(url).pathname;

  // Network-first para sistema.html (siempre bajá la versión más nueva)
  if (NETWORK_FIRST.some(p => path === p || path.endsWith(p))) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first para el resto (logos, manifest, fotos)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => new Response('Sin conexión', { status: 503 }));
    })
  );
});

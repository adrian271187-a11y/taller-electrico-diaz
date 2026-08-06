const CACHE_NAME = 'taller-diaz-v1';

// Archivos que se guardan en caché para modo offline
const STATIC_ASSETS = [
  '/sistema.html',
  '/logo.jpeg',
  '/logo-negro.jpg',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Barlow+Condensed:wght@600;700;800&display=swap',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js'
];

// Instalar — guardar assets en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Si algún asset falla, continuar igual
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activar — limpiar cachés viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch — Network first, caché como fallback
self.addEventListener('fetch', event => {
  // Solo cachear GET requests
  if (event.request.method !== 'GET') return;

  // Firebase y Google APIs — siempre network first
  const url = event.request.url;
  if (url.includes('firestore.googleapis.com') ||
      url.includes('firebase') ||
      url.includes('script.google.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Guardar copia en caché si la respuesta es válida
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Sin internet — servir desde caché
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Si no hay caché, mostrar página offline básica
          if (event.request.destination === 'document') {
            return new Response(
              `<!DOCTYPE html><html><head><meta charset="UTF-8">
              <title>Sin conexión — Taller Díaz</title>
              <style>body{font-family:Arial,sans-serif;background:#060608;color:#f0f0ec;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;flex-direction:column;gap:16px;}
              h2{color:#C9A84C;font-size:1.5rem;}p{color:#6b6b72;text-align:center;}</style></head>
              <body><h2>⚡ Taller Eléctrico Díaz</h2>
              <p>Sin conexión a internet.<br>Verificá tu red e intentá de nuevo.</p>
              <button onclick="location.reload()" style="padding:10px 24px;background:#C9A84C;border:none;border-radius:8px;color:#000;font-weight:700;cursor:pointer;margin-top:8px;">Reintentar</button>
              </body></html>`,
              { headers: { 'Content-Type': 'text/html' } }
            );
          }
        });
      })
  );
});

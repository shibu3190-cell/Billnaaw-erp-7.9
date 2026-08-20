/* =====================================================================
   Om Betar Bhawan ERP - Service Worker
   Strategy:
     - App shell (html/css/js/icons/manifest): cache-first, refreshed in background
     - CDN libs (tesseract, html5-qrcode, fonts): stale-while-revalidate
     - Everything else (e.g. Google Sheets sync POST): network only, never cached
   Bump CACHE_VERSION whenever you change app shell files to force an update.
   ===================================================================== */
const CACHE_VERSION = 'billnow-erp-v19';
// Vendor libraries are versioned by URL, so they survive a shell cache bump.
const VENDOR_CACHE = 'billnow-vendor-v1';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './billnaw.js',
  './billnaw.css',
  './screens/wide.png',
  './screens/narrow.png',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png'
];

// Install: pre-cache the app shell.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('SW precache failed:', err))
  );
});

// Activate: clean up old caches.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        // Keep the vendor cache: those libraries are pinned by URL and
        // re-downloading a multi-megabyte OCR engine on every deploy would
        // leave a shop without a scanner until it next had internet.
        keys.filter(k => !k.startsWith(CACHE_VERSION) && k !== VENDOR_CACHE)
            .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Allow the page to ask the SW to activate a new version immediately.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // never cache POST (cloud sync etc.)

  const url = new URL(request.url);
  const isShell = url.origin === self.location.origin;

  // Network-first for the page and its own scripts/styles: a deploy must be
  // visible on the next open, not the one after. Cache is still the fallback,
  // so offline billing is unaffected.
  const isOwnCode = isShell && /\.(html|js|css)$|\/$/.test(url.pathname);
  if (isOwnCode) {
    event.respondWith(
      fetch(request)
        .then(resp => {
          if (resp && resp.status === 200) {
            const copy = resp.clone();
            caches.open(SHELL_CACHE).then(c => c.put(request, copy));
          }
          return resp;
        })
        .catch(() => caches.match(request).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  // The camera scanner and the OCR engine load from CDNs and were never
  // cached, so the app's own message — "the camera-scanner library hasn't
  // loaded yet" — appeared every time the shop lost internet. Cache them the
  // first time they succeed, then serve from cache forever.
  const isVendor = !isShell && /unpkg\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com/.test(url.hostname);
  if (isVendor) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(resp => {
          // Opaque responses have status 0; they still replay offline.
          if (resp && (resp.status === 200 || resp.type === 'opaque')) {
            const copy = resp.clone();
            caches.open(VENDOR_CACHE).then(c => c.put(request, copy));
          }
          return resp;
        }).catch(() => cached);
      })
    );
    return;
  }

  if (isShell) {
    // Cache-first for images, icons and the manifest, with background refresh.
    event.respondWith(
      caches.match(request).then(cached => {
        const network = fetch(request).then(resp => {
          if (resp && resp.status === 200) {
            const copy = resp.clone();
            caches.open(SHELL_CACHE).then(c => c.put(request, copy));
          }
          return resp;
        }).catch(() => cached);
        return cached || network;
      })
    );
  } else {
    // Stale-while-revalidate for CDN libs / fonts.
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(cache =>
        cache.match(request).then(cached => {
          const network = fetch(request).then(resp => {
            if (resp && (resp.status === 200 || resp.type === 'opaque')) {
              cache.put(request, resp.clone());
            }
            return resp;
          }).catch(() => cached);
          return cached || network;
        })
      )
    );
  }
});

const CACHE_NAME = 'clinical-portal-v2';
const SHARED_CACHE = 'shared-files-cache';

// --- 1. INSTALL & INSTANT TAKEOVER ---
self.addEventListener('install', (e) => {
  self.skipWaiting(); // Force the new version to take over immediately
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(['/']))
  );
});

// --- 2. CLEAN UP OLD ZOMBIE CACHES ---
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete anything that isn't our current version or our shared files
          if (cacheName !== CACHE_NAME && cacheName !== SHARED_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Claim all open tabs immediately
  );
});

// --- 3. FETCH STRATEGIES ---
self.addEventListener('fetch', (e) => {
  // A. CATCH ANDROID SHARE FILES (Your existing share logic)
  if (e.request.method === 'POST' && e.request.url.includes('incoming_share=true')) {
    e.respondWith((async () => {
      try {
        const formData = await e.request.formData();
        const file = formData.get('file');
        const text = formData.get('text');

        const cache = await caches.open(SHARED_CACHE);
        
        if (file) {
          await cache.put('/latest-shared-file', new Response(file, {
            headers: { 'Content-Type': file.type, 'X-File-Name': file.name || 'Shared_Document' }
          }));
        }
        if (text) {
          await cache.put('/latest-shared-text', new Response(text));
        }
      } catch (err) {
        console.error("Error catching shared item:", err);
      }
      return Response.redirect('/?incoming_share=true', 303);
    })());
    return;
  }

  // B. NETWORK-FIRST STRATEGY (Fixes the White Screen!)
  // For HTML and page navigation, ALWAYS try the internet first.
  if (e.request.mode === 'navigate' || (e.request.headers.get('accept') && e.request.headers.get('accept').includes('text/html'))) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request)) // If offline, fallback to cache
    );
    return;
  }

  // C. STALE-WHILE-REVALIDATE (For JS, CSS, and Images)
  if (e.request.method === 'GET') {
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        const fetchPromise = fetch(e.request).then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, networkResponse.clone());
          });
          return networkResponse;
        });
        return cachedResponse || fetchPromise;
      })
    );
  }
});

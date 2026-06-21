const CACHE_NAME = 'clinical-portal-v2';
const SHARED_CACHE = 'shared-files-cache';

// --- 1. INSTALL & INSTANT TAKEOVER ---
self.addEventListener('install', (e) => {
  self.skipWaiting(); 
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(['/'])));
});

// --- 2. CLEAN UP OLD ZOMBIE CACHES ---
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== SHARED_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// --- 3. FETCH & SHARE INTERCEPTOR ---
self.addEventListener('fetch', (e) => {
  
  // 🚨 THE SHARE INTERCEPTOR
  // Catch ANY POST request aimed at the React frontend itself to prevent Android 405 errors
  if (e.request.method === 'POST' && e.request.url.startsWith(self.location.origin)) {
    e.respondWith((async () => {
      try {
        const formData = await e.request.formData();
        
        // 1. CATCH ALL TEXT FORMATS
        // Android apps share text using different fields. We catch them all.
        const text = formData.get('text') || '';
        const title = formData.get('title') || '';
        const subject = formData.get('subject') || '';
        const url = formData.get('url') || '';
        const fullText = [subject, title, text, url].filter(Boolean).join('\n\n');

        // 2. CATCH FILES (Images, PDFs)
        const file = formData.get('file');
        
        // 3. STORE IN CACHE FOR REACT TO FIND
        const cache = await caches.open(SHARED_CACHE);
        
        // Ensure it's a real file, not a 0-byte ghost
        if (file && typeof file !== 'string' && file.size > 0) {
          await cache.put('/latest-shared-file', new Response(file, {
            headers: { 'Content-Type': file.type, 'X-File-Name': file.name || 'Shared_Document' }
          }));
        } 
        else if (fullText) {
          await cache.put('/latest-shared-text', new Response(fullText));
        }

      } catch (err) { 
        // 🚨 Write the system error to cache so React can show it in the modal!
        const cache = await caches.open(SHARED_CACHE);
        await cache.put('/latest-shared-text', new Response(`[SYSTEM PARSE ERROR]: ${err.message}`));
      }
      
      // 4. WAKE UP THE APP
      // Manual 303 Redirect to force a safe GET request back to React
      return new Response(null, {
        status: 303,
        headers: { Location: '/?incoming_share=true' }
      });
    })());
    return;
  }

  // --- STANDARD NETWORK/CACHE LOGIC ---
  if (e.request.mode === 'navigate' || (e.request.headers.get('accept') && e.request.headers.get('accept').includes('text/html'))) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

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

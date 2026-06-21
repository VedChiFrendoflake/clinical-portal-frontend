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
  if (e.request.method === 'POST' && e.request.url.includes('incoming_share=true')) {
    e.respondWith((async () => {
      try {
        // Read the incoming payload from the Android OS
        const formData = await e.request.formData();
        
        // 1. CATCH ALL TEXT FORMATS
        // Android apps are notoriously inconsistent. WhatsApp uses 'text', 
        // Chrome uses 'url', Gmail uses 'subject'. We catch them all.
        const text = formData.get('text') || '';
        const title = formData.get('title') || '';
        const subject = formData.get('subject') || '';
        const url = formData.get('url') || '';
        
        // Combine any found text into one solid block
        const fullText = [subject, title, text, url].filter(Boolean).join('\n\n');

        // 2. CATCH FILES (Images, PDFs)
        const file = formData.get('file');

        // 3. STORE IN CACHE FOR REACT TO FIND
        const cache = await caches.open(SHARED_CACHE);
        
        if (file) {
          await cache.put('/latest-shared-file', new Response(file, {
            headers: { 'Content-Type': file.type, 'X-File-Name': file.name || 'Shared_Document' }
          }));
        }
        
        if (fullText) {
          await cache.put('/latest-shared-text', new Response(fullText));
        }

      } catch (err) {
        console.error("Error catching shared item:", err);
      }
      
      // 4. WAKE UP THE APP
      // Redirect the user into the React app so it can process the cache
      return Response.redirect('/?incoming_share=true', 303);
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

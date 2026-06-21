const CACHE_NAME = 'clinical-portal-v2';
const SHARED_CACHE = 'shared-files-cache';

self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(['/']))); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => { if (k !== CACHE_NAME && k !== SHARED_CACHE) return caches.delete(k); }))).then(() => self.clients.claim())); });

self.addEventListener('fetch', (e) => {
  if (e.request.method === 'POST' && e.request.url.includes('incoming_share=true')) {
    e.respondWith((async () => {
      try {
        const formData = await e.request.formData();
        const file = formData.get('file');
        
        // Android apps share text using completely random field names. Catch them all!
        const text = formData.get('text') || '';
        const title = formData.get('title') || '';
        const subject = formData.get('subject') || '';
        const url = formData.get('url') || '';
        
        // Combine them all together
        const fullText = [subject, title, text, url].filter(Boolean).join('\n\n');

        const cache = await caches.open(SHARED_CACHE);
        if (file) { await cache.put('/latest-shared-file', new Response(file, { headers: { 'Content-Type': file.type, 'X-File-Name': file.name || 'Shared_Document' } })); }
        if (fullText) { await cache.put('/latest-shared-text', new Response(fullText)); }
      } catch (err) { console.error(err); }
      return Response.redirect('/?incoming_share=true', 303);
    })());
    return;
  }

  if (e.request.mode === 'navigate' || (e.request.headers.get('accept') && e.request.headers.get('accept').includes('text/html'))) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  if (e.request.method === 'GET') {
    e.respondWith(caches.match(e.request).then((cRes) => {
      const fetchPromise = fetch(e.request).then((nRes) => { caches.open(CACHE_NAME).then((c) => { c.put(e.request, nRes.clone()); }); return nRes; });
      return cRes || fetchPromise;
    }));
  }
});

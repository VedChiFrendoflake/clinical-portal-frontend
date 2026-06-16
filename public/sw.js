self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('clinical-portal-store').then((cache) => cache.addAll(['/']))
  );
});

self.addEventListener('fetch', (e) => {
  // 1. CATCH ANDROID SHARE FILES
  if (e.request.method === 'POST' && e.request.url.includes('incoming_share=true')) {
    e.respondWith((async () => {
      try {
        const formData = await e.request.formData();
        const file = formData.get('file'); // Or whatever the parameter name is in your share_target
        const text = formData.get('text'); // Catch forwarded text messages

        const cache = await caches.open('shared-files-cache');
        
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
      
      // Redirect to the app with a flag!
      return Response.redirect('/?incoming_share=true', 303);
    })());
    return;
  }

  // 2. STANDARD OFFLINE CACHE (Only for GET requests)
  if (e.request.method === 'GET') {
    e.respondWith(
      caches.match(e.request).then((response) => response || fetch(e.request))
    );
  }
});

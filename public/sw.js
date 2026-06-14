self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Catch the native incoming share request from other apps
  if (event.request.url.endsWith('/handle-share') && event.request.method === 'POST') {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          const file = formData.get('shared_file');

          const cache = await caches.open('incoming-shares');
          if (file) {
            await cache.put('shared-file', new Response(file));
          }

          // Redirect the user directly into the main application interface
          return Response.redirect('/?incoming_share=true', 303);
        } catch (err) {
          return Response.redirect('/?share_error=true', 303);
        }
      })()
    );
  }
});

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.endsWith('/handle-share') && event.request.method === 'POST') {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          const file = formData.get('shared_file');
          const text = formData.get('text');
          const title = formData.get('title');
          const url = formData.get('url');

          const cache = await caches.open('incoming-shares');

          if (file) {
            await cache.put('shared-file', new Response(file));
          }

          const combinedText = [title, text, url].filter(Boolean).join('\n');
          if (combinedText.trim().length > 0) {
            await cache.put('shared-text', new Response(combinedText));
          }

          return Response.redirect('/?incoming_share=true', 303);
        } catch (err) {
          return Response.redirect('/?share_error=true', 303);
        }
      })()
    );
  }
});

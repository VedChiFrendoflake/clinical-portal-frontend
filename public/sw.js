self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Catch the native incoming share request from other mobile apps
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

          // 1. If an image or PDF file was shared, cache the file payload
          if (file) {
            await cache.put('shared-file', new Response(file));
          }

          // 2. If a plain text string message or web link was shared, cache the text payload
          const combinedText = [title, text, url].filter(Boolean).join('\n');
          if (combinedText.trim().length > 0) {
            await cache.put('shared-text', new Response(combinedText));
          }

          // Redirect the user directly into the main portal dashboard
          return Response.redirect('/?incoming_share=true', 303);
        } catch (err) {
          return Response.redirect('/?share_error=true', 303);
        }
      })()
    );
  }
});

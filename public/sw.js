// 1. Your existing Install Event (Keeps the app working offline)
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('clinical-portal-store').then((cache) => cache.addAll(['/']))
  );
});

// 2. The Combined Fetch Event
self.addEventListener('fetch', (e) => {
  
  // --- NEW CAPABILITY: Catch the Android Share File ---
  if (e.request.method === 'POST' && e.request.url.includes('incoming_share=true')) {
    e.respondWith((async () => {
      try {
        const formData = await e.request.formData();
        const file = formData.get('file');

        if (file) {
          // Save the file in a temporary hidden cache
          const cache = await caches.open('shared-files-cache');
          await cache.put('/latest-shared-file', new Response(file, {
            headers: {
              'Content-Type': file.type,
              'X-File-Name': file.name || 'Shared_Document'
            }
          }));
        }
      } catch (err) {
        console.error("Error catching shared file:", err);
      }
      
      // Redirect the user to the main app so React can load
      return Response.redirect('/', 303);
    })());
    
    return; // Stop here so it doesn't run the standard cache logic below
  }

  // --- YOUR EXISTING CAPABILITY: Standard Offline Caching ---
  // (We only want this to run for normal GET requests, not POSTs)
  if (e.request.method === 'GET') {
    e.respondWith(
      caches.match(e.request).then((response) => response || fetch(e.request))
    );
  }
});

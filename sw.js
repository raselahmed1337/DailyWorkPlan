const CACHE = 'scholarsync-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

// Background sync: check reminders every 60s when app is open
let checkInterval;
self.addEventListener('message', (e) => {
  if (e.data === 'start-reminder-checker') {
    if (!checkInterval) {
      checkInterval = setInterval(() => {
        // Notify main thread to check reminders
        self.clients.matchAll().then(clients => {
          clients.forEach(c => c.postMessage({ type: 'check-reminders' }));
        });
      }, 60000);
    }
  }
});

// Cache static assets for offline use
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }))
  );
});
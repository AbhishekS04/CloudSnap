const CACHE_NAME = 'cloudsnap-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Simple pass-through or basic caching strategy if needed
    // For now, network-only to avoid complexity, but satisfying PWA requirement
    // event.respondWith(fetch(event.request));
});

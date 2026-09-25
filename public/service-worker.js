const CACHE_NAME = 'stocksim-cache-v1';
const urlsToCache = [
  '/',              // Home
  '/offline.html',  // Offline fallback
  '/favicon.ico',   // Essential assets
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png'
];

// Pre-cache key assets during install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Serve cached files only for navigation requests, network fallback, then offline.html
// IMPORTANT: Never intercept API calls, Firebase Auth, or external token endpoints
self.addEventListener('fetch', event => {
  // Only handle navigation requests (HTML pages). Never intercept API or script fetches.
  if (event.request.mode !== 'navigate') {
    return;
  }

  const url = new URL(event.request.url);

  // Never cache/intercept Firebase Auth handler or OAuth callback URLs or API endpoints
  if (url.pathname.startsWith('/__/auth/') ||
      url.pathname.startsWith('/api/') ||
      url.hostname.includes('accounts.google.com') ||
      url.hostname.includes('github.com') ||
      url.hostname.includes('firebaseapp.com') ||
      url.hostname.includes('googleapis.com')) {
    return; // Let the browser handle these natively
  }

  event.respondWith(
    caches.match(event.request).then(
      response => response ||
        fetch(event.request).catch(() => caches.match('/offline.html'))
    )
  );
});

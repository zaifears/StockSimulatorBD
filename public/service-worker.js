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

// Serve cached files for requests, network fallback, then offline.html
// IMPORTANT: Skip Firebase Auth / OAuth related requests to avoid breaking social sign-in
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never cache/intercept Firebase Auth handler or OAuth callback URLs
  if (url.pathname.startsWith('/__/auth/') ||
      url.pathname.startsWith('/api/auth/') ||
      url.hostname.includes('accounts.google.com') ||
      url.hostname.includes('github.com/login') ||
      url.hostname.includes('firebaseapp.com') ||
      url.hostname.includes('googleapis.com/identitytoolkit')) {
    return; // Let the browser handle these natively
  }

  event.respondWith(
    caches.match(event.request).then(
      response => response ||
        fetch(event.request).catch(() => caches.match('/offline.html'))
    )
  );
});

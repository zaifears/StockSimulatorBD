'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      (window as unknown as { workbox?: unknown }).workbox === undefined // Avoid conflict if using next-pwa
    ) {
      // Register the service worker from public/sw.js
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  return null;
}

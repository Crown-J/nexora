/**
 * NEXORA PWA — minimal service worker（純網頁 PWA：可安裝）
 * 之後若要離線快取可在此擴充 caches。
 */
const CACHE_NAME = 'nexora-pwa-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', () => {
  /* 預設走網路；保留 handler 以便瀏覽器辨識為可控 SW */
});

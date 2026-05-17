/**
 * NEXORA PWA — Service Worker（純網頁 PWA：可安裝 + Web Push）
 *
 * NX06-IMPL-02 Phase 5：升級 push notification 處理（Web Push API）。
 *   - install / activate / fetch：原本既有
 *   - push：接收 push payload (JSON: { title, body, url })、顯示 notification
 *   - notificationclick：點通知開對應 url
 *
 * 之後若要離線快取可在此擴充 caches。
 */
const CACHE_NAME = 'nexora-pwa-v2';

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

/**
 * Web Push payload handler（NX06-IMPL-02）
 * payload JSON schema：{ title: string, body: string, url?: string, tag?: string }
 */
self.addEventListener('push', (event) => {
  let data = { title: 'NEXORA', body: '', url: '/' };
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (_e) {
      data.body = event.data.text();
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'nexora-push',
      data: { url: data.url || '/' },
    }),
  );
});

/** notification click → 開對應 url（既有 tab focus / 新 tab open）。 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })(),
  );
});

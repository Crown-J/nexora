// apps/nx-ui/src/features/nx06/push-subscription.ts
// NX06 Web Push 訂閱客戶端 helper（PWA 用）
//
// 對齊：
//   - overview v0.2.0 §4.5 推播服務（Web Push API + Email fallback iOS 舊版）
//   - backend API：POST /nx06/push/subscribe
//
// 用法：
//   import { subscribeToPush, unsubscribeFromPush } from '@/features/nx06/push-subscription';
//   await subscribeToPush(vapidPublicKey);  // PWA 啟動時呼叫
//
// 注意：
//   - VAPID public key 須 deploy 時設定（後續軌 backlog）
//   - iOS 16.4+ 才支援、舊版瀏覽器走 Email fallback（本軌 stub）

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buf = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i);
  return buf;
}

/** 檢查瀏覽器是否支援 Web Push（iOS 15 以下 / 桌面舊版不支援）。 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** 訂閱 Web Push（call POST /nx06/push/subscribe 寫 backend）。 */
export async function subscribeToPush(vapidPublicKey: string): Promise<{ ok: boolean; reason?: string }> {
  if (!isPushSupported()) {
    return { ok: false, reason: 'browser not supported (iOS 15- or old)' };
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    return { ok: false, reason: `notification permission ${perm}` };
  }
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToArrayBuffer(vapidPublicKey),
  });
  const json = sub.toJSON();
  const resp = await fetch('/api/nx06/push/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      endpoint: json.endpoint,
      p256dhKey: json.keys?.p256dh ?? '',
      authKey: json.keys?.auth ?? '',
      userAgent: navigator.userAgent,
    }),
  });
  if (!resp.ok) return { ok: false, reason: `subscribe API HTTP ${resp.status}` };
  return { ok: true };
}

/** 取消訂閱（瀏覽器端 + backend 同步 is_active=false）。 */
export async function unsubscribeFromPush(): Promise<{ ok: boolean; reason?: string }> {
  if (!isPushSupported()) return { ok: false, reason: 'not supported' };
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return { ok: true, reason: 'no active subscription' };
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await fetch('/api/nx06/push/subscribe', {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ endpoint }),
  });
  return { ok: true };
}

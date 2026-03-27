'use client';

import { useEffect } from 'react';

/**
 * 在 production 註冊 `public/sw.js`，讓瀏覽器可將本站視為可安裝的 PWA。
 * 開發模式不註冊，避免快取與 HMR 干擾。
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      /* 註冊失敗時仍可依 manifest 顯示捷徑，但部分瀏覽器可能不顯示「安裝」 */
    });
  }, []);

  return null;
}

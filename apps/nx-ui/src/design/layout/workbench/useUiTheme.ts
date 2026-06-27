// apps/nx-ui/src/design/layout/workbench/useUiTheme.ts
// 深淺主題（html.light）狀態：localStorage 'nx-theme' 持久。
// 傳統 ERP 外殼預設淺色（白底專業感）；使用者仍可切深色。

'use client';

import { useCallback, useEffect, useState } from 'react';

export function useUiTheme() {
  const [light, setLight] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const v = window.localStorage.getItem('nx-theme');
    // 未設定 → 預設淺色（傳統 ERP 白底）
    return v === null ? true : v === 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('light', light);
  }, [light]);

  const toggle = useCallback(() => {
    setLight((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem('nx-theme', next ? 'light' : 'dark');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { light, toggle };
}

// apps/nx-ui/src/components/shell/NxAppBackdrop.tsx
// NX00 全 app 底色 backdrop（登入 / 首頁 / 子頁共用）
// 對齊 Hana NEXORA 系統.html body background：
// - 深色：黑底 + 三道頂部極光（青/紫/金）+ 中央深色 vignette
// - 淺色：白/灰藍漸層 + 中央光暈（對齊 html.light body.state-app）
// 監聽 html.light class 切換、即時跟主題

'use client';

import { useSyncExternalStore } from 'react';

const DARK_BG = [
  'radial-gradient(ellipse 60% 50% at 18% 0%, rgba(40,200,180,.12), transparent 58%)',
  'radial-gradient(ellipse 50% 44% at 82% 0%, rgba(120,84,200,.14), transparent 60%)',
  'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(160,116,32,.12), transparent 52%)',
  'radial-gradient(circle at 50% 30%, #0a1014, #070b0e 60%, #04070a 100%)',
].join(', ');

const LIGHT_BG = [
  'radial-gradient(ellipse 90% 50% at 50% 0%, #ffffff, transparent 70%)',
  'linear-gradient(180deg, #eef2f6 0%, #e4e9f0 60%, #dce2ea 100%)',
].join(', ');

// External store：監聽 html.light class 即時切換
function subscribe(cb: () => void): () => void {
  if (typeof document === 'undefined') return () => {};
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => obs.disconnect();
}
function getSnapshot(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('light');
}
function getServerSnapshot(): boolean {
  return false;
}

export function NxAppBackdrop() {
  const light = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-0 pointer-events-none transition-[background] duration-300"
      style={{ background: light ? LIGHT_BG : DARK_BG }}
    />
  );
}

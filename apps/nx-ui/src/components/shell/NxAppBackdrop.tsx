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

// 淺色三層：雪花 SVG 紋理（52×91 tile）+ 中央白色光暈 + 灰藍漸層底
// 對齊 Hana html.light body.state-app 範式
const LIGHT_BG = [
  `url("data:image/svg+xml,%3Csvg width='28' height='49' viewBox='0 0 28 49' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%237d8aa0' fill-opacity='0.09'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
  'radial-gradient(ellipse 90% 50% at 50% 0%, #ffffff, transparent 70%)',
  'linear-gradient(180deg, #eef2f6 0%, #e4e9f0 60%, #dce2ea 100%)',
].join(', ');
const LIGHT_BG_SIZE = '52px 91px, auto, auto';

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
      style={{
        background: light ? LIGHT_BG : DARK_BG,
        backgroundSize: light ? LIGHT_BG_SIZE : undefined,
      }}
    />
  );
}

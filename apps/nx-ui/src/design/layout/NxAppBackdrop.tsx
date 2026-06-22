// apps/nx-ui/src/design/layout/NxAppBackdrop.tsx
// NX00 全 app 底色 backdrop（root layout 一次性掛、跨路由不重 mount、避免切頁瞬間露 body bg）
// - 深色：黑底 + 三道頂部極光（青/紫/金）+ 中央深色 vignette + ParticleField 粒子
// - 淺色：白光暈 + 灰藍漸層底（snowflake 紋理改由 HexBulgeField canvas 渲染、滑鼠靠近會凸起）
// 監聽 html.light class、即時跟主題

'use client';

import { useSyncExternalStore } from 'react';
import { ParticleField } from '@design/login/planet-orbit';
import { HexBulgeField } from '@design/layout/HexBulgeField';

const DARK_BG = [
  'radial-gradient(ellipse 60% 50% at 18% 0%, rgba(40,200,180,.12), transparent 58%)',
  'radial-gradient(ellipse 50% 44% at 82% 0%, rgba(120,84,200,.14), transparent 60%)',
  'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(160,116,32,.12), transparent 52%)',
  'radial-gradient(circle at 50% 30%, #0a1014, #070b0e 60%, #04070a 100%)',
].join(', ');

// 淺色兩層：白光暈 + 灰藍漸層底（snowflake 紋理交給 HexBulgeField canvas 處理、跟原 CSS url() 同形狀同間距、但滑鼠靠近會放大凸出）
const LIGHT_BG = [
  'radial-gradient(ellipse 90% 50% at 50% 0%, #ffffff, transparent 70%)',
  'linear-gradient(180deg, #eef2f6 0%, #e4e9f0 60%, #dce2ea 100%)',
].join(', ');

// External store：監聽 html.light class、即時切換
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
    <>
      <div
        aria-hidden
        className="fixed inset-0 z-0 pointer-events-none transition-[background] duration-300"
        style={{
          background: light ? LIGHT_BG : DARK_BG,
        }}
      />
      {/* 互動層：深色粒子、淺色滑鼠跟六角凸出 */}
      {light ? (
        <HexBulgeField className="fixed inset-0 z-0 pointer-events-none" />
      ) : (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <ParticleField className="w-full h-full" />
        </div>
      )}
    </>
  );
}

// apps/nx-ui/src/design/motion/scatter/ScatterPageGate.tsx
// 2026-06-19 頁切換 radial scatter transition
//   對齊 docs/專案/介面規格/.../system-integrate.js setScatter 範式:
//   - 每個 [data-nx-frame] 元素計算「相對 host 中心的位置向量」
//   - 散開:沿向量推 push px + scale 0.9 + opacity 0
//   - 合攏:回原位
//   - cubic-bezier(.34, .05, .2, 1)、scatter 300ms、gather 440ms
//
// 階段 1（本檔）:只做進場 enter scatter→gather
//   - useLayoutEffect 在 paint 前套散開、避免新頁 flash 原位
//   - requestAnimationFrame 後套 transition + 回原位（合攏）
//   - 舊頁 hard unmount（next.js router 自動）
//   階段 2 後續可加 ScatterPageProvider 攔截 navigation 做 exit scatter
'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

const SELECTOR = '[data-nx-frame]';
const PUSH = 120;
const GATHER_MS = 440;
const EASING = 'cubic-bezier(.34, .05, .2, 1)';

export function ScatterPageGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/';
  const hostRef = useRef<HTMLDivElement>(null);
  const reducedMotionRef = useRef<boolean>(false);

  // 偵測 prefers-reduced-motion（mount 一次、不動態切）
  useLayoutEffect(() => {
    reducedMotionRef.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
  }, []);

  useLayoutEffect(() => {
    if (reducedMotionRef.current) return;
    const host = hostRef.current;
    if (!host) return;
    const frames = Array.from(host.querySelectorAll<HTMLElement>(SELECTOR));
    if (frames.length === 0) return;

    const hostRect = host.getBoundingClientRect();
    const cx = hostRect.left + hostRect.width / 2;
    const cy = hostRect.top + hostRect.height / 2;

    // 1. 瞬間套「散開」狀態（無 transition、user 不會看到原位 flash）
    frames.forEach((elm) => {
      const r = elm.getBoundingClientRect();
      const dx = r.left + r.width / 2 - cx;
      const dy = r.top + r.height / 2 - cy;
      const m = Math.hypot(dx, dy) || 1;
      elm.style.transition = 'none';
      elm.style.transform = `translate(${((dx / m) * PUSH).toFixed(1)}px, ${(
        (dy / m) *
        PUSH
      ).toFixed(1)}px) scale(.9)`;
      elm.style.opacity = '0';
      elm.style.willChange = 'transform, opacity';
    });

    // 2. 強制 reflow、確保散開狀態被瀏覽器記入
    void host.offsetWidth;

    // 3. 下一幀套 transition + 移除 inline transform/opacity（觸發合攏）
    const rafId = requestAnimationFrame(() => {
      frames.forEach((elm) => {
        elm.style.transition = `transform ${GATHER_MS}ms ${EASING}, opacity ${Math.round(
          GATHER_MS * 0.92,
        )}ms ease-out`;
        elm.style.transform = '';
        elm.style.opacity = '';
      });
    });

    // 4. 合攏結束、清 transition / willChange（避免影響後續 hover 等動畫）
    const cleanupId = window.setTimeout(() => {
      frames.forEach((elm) => {
        elm.style.transition = '';
        elm.style.willChange = '';
      });
    }, GATHER_MS + 60);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(cleanupId);
      // 中斷:還原 inline style 避免卡在動畫中段
      frames.forEach((elm) => {
        elm.style.transition = '';
        elm.style.transform = '';
        elm.style.opacity = '';
        elm.style.willChange = '';
      });
    };
  }, [pathname]);

  return (
    <div ref={hostRef} className="flex min-h-0 flex-1 flex-col">
      {children}
    </div>
  );
}

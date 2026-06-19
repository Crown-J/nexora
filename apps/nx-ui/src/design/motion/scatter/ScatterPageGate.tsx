// apps/nx-ui/src/design/motion/scatter/ScatterPageGate.tsx
// 2026-06-19 頁切換 radial scatter transition（完整「散開→swap→聚集」）
//   對齊 docs/專案/介面規格/.../system-integrate.js setScatter 範式:
//   - 每個 [data-nx-frame] 元素計算「相對 host 中心的位置向量」
//   - exit scatter:沿向量推 PUSH px + scale 0.9 + opacity 0、300ms easeIn
//   - enter gather:從散開狀態回原位、440ms cubic-bezier(.34, .05, .2, 1)
//
// 階段 2:配合 tryNavigate（useDirtyGuard.registerScatterNavigate）
//   tryNavigate 呼叫 → scatter exit → 完成才 navigate → 新頁 mount → enter gather
//   完整「散開→swap→聚集」感
//
// 連點防護:scatter 進行中、新 tryNavigate 直接 ignore（避免雙重 navigate）
//   pathname 變化 reset isScattering（新頁 mount 後重置）
//
// reduced-motion:跳過動畫、直接 navigate / mount
'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { registerScatterNavigate } from '@design/hooks/useDirtyGuard';

const SELECTOR = '[data-nx-frame]';
const PUSH = 120;
const SCATTER_MS = 300;
const GATHER_MS = 440;
const EASING = 'cubic-bezier(.34, .05, .2, 1)';

function applyScatter(
  host: HTMLElement,
  frames: HTMLElement[],
  durationMs: number,
  easing: string,
  instant: boolean,
) {
  const hostRect = host.getBoundingClientRect();
  const cx = hostRect.left + hostRect.width / 2;
  const cy = hostRect.top + hostRect.height / 2;
  frames.forEach((elm) => {
    const r = elm.getBoundingClientRect();
    const dx = r.left + r.width / 2 - cx;
    const dy = r.top + r.height / 2 - cy;
    const m = Math.hypot(dx, dy) || 1;
    elm.style.transition = instant
      ? 'none'
      : `transform ${durationMs}ms ${easing}, opacity ${Math.round(durationMs * 0.93)}ms ease-in`;
    elm.style.transform = `translate(${((dx / m) * PUSH).toFixed(1)}px, ${(
      (dy / m) *
      PUSH
    ).toFixed(1)}px) scale(.9)`;
    elm.style.opacity = '0';
    elm.style.willChange = 'transform, opacity';
  });
}

function clearScatter(frames: HTMLElement[]) {
  frames.forEach((elm) => {
    elm.style.transition = '';
    elm.style.transform = '';
    elm.style.opacity = '';
    elm.style.willChange = '';
  });
}

export function ScatterPageGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/';
  const hostRef = useRef<HTMLDivElement>(null);
  const reducedMotionRef = useRef<boolean>(false);
  const isScatteringRef = useRef<boolean>(false);
  const scatterTimerRef = useRef<number | null>(null);

  // mount:偵測 prefers-reduced-motion + 註冊 scatter exit 給 tryNavigate
  useLayoutEffect(() => {
    reducedMotionRef.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const unregister = registerScatterNavigate((navigateFn) => {
      // 連點防護:scatter 中重複呼叫 ignore
      if (isScatteringRef.current) return;
      const host = hostRef.current;
      if (!host || reducedMotionRef.current) {
        navigateFn();
        return;
      }
      const frames = Array.from(host.querySelectorAll<HTMLElement>(SELECTOR));
      if (frames.length === 0) {
        navigateFn();
        return;
      }
      isScatteringRef.current = true;
      applyScatter(host, frames, SCATTER_MS, EASING, false);
      scatterTimerRef.current = window.setTimeout(() => {
        scatterTimerRef.current = null;
        navigateFn();
        // isScatteringRef 在 pathname 變化（新頁 mount）的 useLayoutEffect reset
      }, SCATTER_MS);
    });

    return () => {
      unregister();
      if (scatterTimerRef.current) clearTimeout(scatterTimerRef.current);
    };
  }, []);

  // pathname 變化 → 新頁 enter gather + reset isScattering
  useLayoutEffect(() => {
    isScatteringRef.current = false;
    if (scatterTimerRef.current) {
      clearTimeout(scatterTimerRef.current);
      scatterTimerRef.current = null;
    }
    if (reducedMotionRef.current) return;
    const host = hostRef.current;
    if (!host) return;
    const frames = Array.from(host.querySelectorAll<HTMLElement>(SELECTOR));
    if (frames.length === 0) return;

    // 1. 瞬間套散開狀態（無 transition、user 不會看到 flash 原位）
    applyScatter(host, frames, 0, EASING, true);

    // 2. 強制 reflow、確保散開被瀏覽器記入
    void host.offsetWidth;

    // 3. 下一幀觸發合攏（gather）
    const rafId = requestAnimationFrame(() => {
      frames.forEach((elm) => {
        elm.style.transition = `transform ${GATHER_MS}ms ${EASING}, opacity ${Math.round(
          GATHER_MS * 0.92,
        )}ms ease-out`;
        elm.style.transform = '';
        elm.style.opacity = '';
      });
    });

    // 4. cleanup 清 inline style
    const cleanupId = window.setTimeout(() => {
      clearScatter(frames);
    }, GATHER_MS + 60);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(cleanupId);
      clearScatter(frames);
    };
  }, [pathname]);

  return (
    <div ref={hostRef} className="flex min-h-0 flex-1 flex-col">
      {children}
    </div>
  );
}

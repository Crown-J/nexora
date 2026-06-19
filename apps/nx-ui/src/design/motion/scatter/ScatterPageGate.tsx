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
const PUSH = 110;                            // 推力略減、視覺更柔
const SCATTER_MS = 360;                      // 出場拉長、不再倉促
const GATHER_MS = 580;                       // 進場慢工出細活、絲滑感最強
// exponential 系列曲線（質感最佳:前段緩、尾段順）
const EASE_OUT_EXPO = 'cubic-bezier(.16, 1, .3, 1)';
const EASE_IN_EXPO = 'cubic-bezier(.7, 0, .84, 0)';
// 元件間 stagger 波浪、視覺更高級（出場由外往內、進場由內往外）
const STAGGER_MS = 28;

/** 把元件依「距 host 中心距離」排序、回傳 [元素, 向量, 距離] tuple */
function computeFrameOffsets(host: HTMLElement, frames: HTMLElement[]) {
  const hostRect = host.getBoundingClientRect();
  const cx = hostRect.left + hostRect.width / 2;
  const cy = hostRect.top + hostRect.height / 2;
  return frames.map((elm) => {
    const r = elm.getBoundingClientRect();
    const dx = r.left + r.width / 2 - cx;
    const dy = r.top + r.height / 2 - cy;
    const m = Math.hypot(dx, dy) || 1;
    return { elm, dx, dy, m };
  });
}

function applyScatter(
  host: HTMLElement,
  frames: HTMLElement[],
  durationMs: number,
  easing: string,
  instant: boolean,
  stagger: { order: 'outerFirst' | 'innerFirst' | 'none' } = { order: 'none' },
) {
  const offsets = computeFrameOffsets(host, frames);
  // 按距離排:outerFirst = 距遠的先動（出場直覺）/ innerFirst = 距近的先動（進場直覺）
  const ordered = [...offsets];
  if (stagger.order === 'outerFirst') ordered.sort((a, b) => b.m - a.m);
  else if (stagger.order === 'innerFirst') ordered.sort((a, b) => a.m - b.m);
  ordered.forEach(({ elm, dx, dy, m }, i) => {
    const delay = instant || stagger.order === 'none' ? 0 : i * STAGGER_MS;
    elm.style.transition = instant
      ? 'none'
      : `transform ${durationMs}ms ${easing} ${delay}ms, opacity ${Math.round(
          durationMs * 0.62,
        )}ms ease-in ${delay}ms`;
    elm.style.transform = `translate(${((dx / m) * PUSH).toFixed(1)}px, ${(
      (dy / m) *
      PUSH
    ).toFixed(1)}px) scale(.92)`;
    elm.style.opacity = '0';
    elm.style.willChange = 'transform, opacity';
    // GPU layer 提示（補 backface 鎖、避免淺色模式 1px 抖）
    elm.style.backfaceVisibility = 'hidden';
  });
}

function clearScatter(frames: HTMLElement[]) {
  frames.forEach((elm) => {
    elm.style.transition = '';
    elm.style.transform = '';
    elm.style.opacity = '';
    elm.style.willChange = '';
    elm.style.backfaceVisibility = '';
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
      // exit:由外往內依序飛走（外圍元件先離場、視覺像「先邊緣後中心」溶解）
      applyScatter(host, frames, SCATTER_MS, EASE_IN_EXPO, false, {
        order: 'outerFirst',
      });
      // 等最後一個 stagger 完成才 navigate
      const totalScatter = SCATTER_MS + STAGGER_MS * Math.max(0, frames.length - 1);
      scatterTimerRef.current = window.setTimeout(() => {
        scatterTimerRef.current = null;
        navigateFn();
        // isScatteringRef 在 pathname 變化（新頁 mount）的 useLayoutEffect reset
      }, totalScatter);
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
    applyScatter(host, frames, 0, EASE_OUT_EXPO, true);

    // 2. 強制 reflow、確保散開被瀏覽器記入
    void host.offsetWidth;

    // 3. 依「距 host 中心」由內往外排序 stagger:中心元件先就位、外圍依序綻放
    const offsets = computeFrameOffsets(host, frames);
    const ordered = [...offsets].sort((a, b) => a.m - b.m);

    // 4. 下一幀觸發合攏（gather）+ 個別 stagger
    const rafId = requestAnimationFrame(() => {
      ordered.forEach(({ elm }, i) => {
        const delay = i * STAGGER_MS;
        elm.style.transition = `transform ${GATHER_MS}ms ${EASE_OUT_EXPO} ${delay}ms, opacity ${Math.round(
          GATHER_MS * 1.05,
        )}ms ease-out ${delay}ms`;
        elm.style.transform = '';
        elm.style.opacity = '';
      });
    });

    // 5. cleanup 清 inline style（含最後一個 stagger 完成）
    const totalGather = GATHER_MS + STAGGER_MS * Math.max(0, frames.length - 1) + 80;
    const cleanupId = window.setTimeout(() => {
      clearScatter(frames);
    }, totalGather);

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

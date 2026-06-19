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
// 對齊 demo system-integrate.js:PUSH 120 / duration .44s / cubic-bezier(.34,.05,.2,1)
const PUSH = 120;
const TRANSFORM_MS = 440;                    // 散開 / 合攏動畫主時長（同 demo）
const OPACITY_MS = 400;                      // 同 demo opacity .4s
const SWAP_DELAY_MS = 300;                   // demo 範式:不等散開完成、300ms 就 swap
const EASING = 'cubic-bezier(.34, .05, .2, 1)';

function applyScatter(
  host: HTMLElement,
  frames: HTMLElement[],
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
      : `transform ${TRANSFORM_MS}ms ${EASING}, opacity ${OPACITY_MS}ms ease`;
    elm.style.transform = `translate(${((dx / m) * PUSH).toFixed(1)}px, ${(
      (dy / m) *
      PUSH
    ).toFixed(1)}px) scale(.9)`;
    elm.style.opacity = '0';
    elm.style.willChange = 'transform, opacity';
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
  // 2026-06-19 fail-safe：scatter exit 後 navigate 沒成功（pathname 沒變），
  // pathname effect 不 fire、isScatteringRef 永遠 true、scatter inline style
  // 永遠不清、整個 dashboard 凍住。fail-safe timer 在 1500ms 後強制 reset。
  const failSafeTimerRef = useRef<number | null>(null);
  const failSafeFramesRef = useRef<HTMLElement[]>([]);
  // last navigate target label：fail-safe 觸發時用、給 user 知道哪個 entry 設錯
  const lastTargetRef = useRef<string>('(unknown)');

  // mount:偵測 prefers-reduced-motion + 註冊 scatter exit 給 tryNavigate
  useLayoutEffect(() => {
    reducedMotionRef.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const unregister = registerScatterNavigate((navigateFn, label) => {
      const target = label ?? '(unknown)';
      lastTargetRef.current = target;
      // 連點防護:scatter 中重複呼叫 ignore
      if (isScatteringRef.current) {
        console.debug('[NX-NAV] scatter 中、ignore', target);
        return;
      }
      const host = hostRef.current;
      if (!host || reducedMotionRef.current) {
        console.debug('[NX-NAV] no host / reduced-motion、direct navigate', target);
        navigateFn();
        return;
      }
      const frames = Array.from(host.querySelectorAll<HTMLElement>(SELECTOR));
      if (frames.length === 0) {
        console.debug('[NX-NAV] 0 frames、direct navigate', target);
        navigateFn();
        return;
      }
      console.debug(`[NX-NAV] scatter exit (${frames.length} frames)`, target);
      isScatteringRef.current = true;
      // demo 範式:套 transition、所有元件同時散開、不 stagger（保留「同一頁面散開」感）
      applyScatter(host, frames, false);
      // demo 範式:不等散開完成（440ms）、300ms 就 navigate
      // 此時元件 opacity 已淡到接近 0、user 看到的是「持續飛離中內容換了」、非「跨頁切換」
      scatterTimerRef.current = window.setTimeout(() => {
        scatterTimerRef.current = null;
        navigateFn();
      }, SWAP_DELAY_MS);

      // fail-safe：navigate 後預期 pathname 變化、useLayoutEffect 會 reset
      // isScatteringRef。如果 1500ms 內仍卡在 scattering（navigate 失敗、
      // 例：dock entry href 設錯到 '#' 或不存在的 path）、強制 reset。
      failSafeFramesRef.current = frames;
      if (failSafeTimerRef.current) clearTimeout(failSafeTimerRef.current);
      failSafeTimerRef.current = window.setTimeout(() => {
        failSafeTimerRef.current = null;
        if (isScatteringRef.current) {
          isScatteringRef.current = false;
          clearScatter(failSafeFramesRef.current);
          failSafeFramesRef.current = [];
          if (typeof console !== 'undefined') {
            console.warn(
              `[ScatterPageGate] fail-safe triggered (target='${lastTargetRef.current}'): navigate did not complete in 1500ms, force reset scatter state`,
            );
          }
        }
      }, 1500);
    });

    return () => {
      unregister();
      if (scatterTimerRef.current) clearTimeout(scatterTimerRef.current);
      if (failSafeTimerRef.current) clearTimeout(failSafeTimerRef.current);
    };
  }, []);

  // pathname 變化 → 新頁 enter gather + reset isScattering
  useLayoutEffect(() => {
    console.debug('[NX-NAV] pathname effect →', pathname);
    isScatteringRef.current = false;
    if (scatterTimerRef.current) {
      clearTimeout(scatterTimerRef.current);
      scatterTimerRef.current = null;
    }
    // navigate 成功，fail-safe 不需要 trigger
    if (failSafeTimerRef.current) {
      clearTimeout(failSafeTimerRef.current);
      failSafeTimerRef.current = null;
      failSafeFramesRef.current = [];
    }
    if (reducedMotionRef.current) return;
    const host = hostRef.current;
    if (!host) return;
    const frames = Array.from(host.querySelectorAll<HTMLElement>(SELECTOR));
    if (frames.length === 0) return;

    // 1. 瞬間套散開狀態（無 transition、user 不會看到 flash 原位）
    applyScatter(host, frames, true);

    // 2. 強制 reflow、確保散開被瀏覽器記入
    void host.offsetWidth;

    // 3. 下一幀觸發合攏（gather）—— demo 範式:同時動、不 stagger
    const rafId = requestAnimationFrame(() => {
      frames.forEach((elm) => {
        elm.style.transition = `transform ${TRANSFORM_MS}ms ${EASING}, opacity ${OPACITY_MS}ms ease`;
        elm.style.transform = '';
        elm.style.opacity = '';
      });
    });

    // 4. cleanup 清 inline style
    const cleanupId = window.setTimeout(() => {
      clearScatter(frames);
    }, TRANSFORM_MS + 80);

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

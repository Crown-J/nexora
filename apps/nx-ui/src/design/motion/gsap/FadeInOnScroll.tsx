// apps/nx-ui/src/design/motion/gsap/FadeInOnScroll.tsx
// ScrollTrigger.batch 長頁進場；reduce-motion 直接顯示。
// 規範見 docs/_team/animation-spec.md §1（7 個 GSAP 場景之一）。
'use client';

import { useRef, type ReactNode } from 'react';
import { gsap, useGSAP, ScrollTrigger } from './register';
import { DURATION, EASE, STAGGER } from './tokens';

type Props = {
  children: ReactNode;
  /** 子元素 selector，預設 '[data-fade]' */
  selector?: string;
  /** 進入時 y 位移（px），預設 24 */
  y?: number;
  /** 動畫時長秒數，預設 DURATION.slow */
  duration?: number;
  /** stagger 秒數，預設 STAGGER.relaxed */
  stagger?: number;
  /** ScrollTrigger start 預設 'top 85%' */
  start?: string;
  className?: string;
};

export function FadeInOnScroll({
  children,
  selector = '[data-fade]',
  y = 24,
  duration = DURATION.slow,
  stagger = STAGGER.relaxed,
  start = 'top 85%',
  className,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const targets = Array.from(
        root.querySelectorAll<HTMLElement>(selector),
      );
      if (targets.length === 0) return;

      const mm = gsap.matchMedia();
      mm.add(
        {
          reduceMotion: '(prefers-reduced-motion: reduce)',
          normal: '(prefers-reduced-motion: no-preference)',
        },
        (ctx) => {
          if (ctx.conditions?.reduceMotion) {
            gsap.set(targets, { autoAlpha: 1, y: 0 });
            return;
          }
          gsap.set(targets, { autoAlpha: 0, y });
          const triggers = ScrollTrigger.batch(targets, {
            start,
            onEnter: (batch) =>
              gsap.to(batch, {
                autoAlpha: 1,
                y: 0,
                duration,
                stagger,
                ease: EASE.enter,
                overwrite: true,
              }),
          });
          return () => triggers.forEach((t) => t.kill());
        },
      );
      return () => mm.revert();
    },
    { scope: ref, dependencies: [selector, y, duration, stagger, start] },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

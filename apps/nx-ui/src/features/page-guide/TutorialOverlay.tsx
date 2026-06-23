// apps/nx-ui/src/features/page-guide/TutorialOverlay.tsx
// v1.2 對齊軌 D：設定精靈引導視窗
// GSAP-FW-S5：進場 timeline（backdrop fade → dialog slide+scale → sections stagger）

'use client';

import { useEffect, useRef } from 'react';

import { gsap, useGSAP } from '@design/motion/gsap';
import { DURATION, EASE, STAGGER } from '@design/motion/gsap';

import type { PageGuideContent } from './content';

interface Props {
  content: PageGuideContent;
  onDismiss: () => void;
}

export function TutorialOverlay({ content, onDismiss }: Props) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // ESC 關閉
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  // GSAP 進場 timeline
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          reduceMotion: '(prefers-reduced-motion: reduce)',
          normal: '(prefers-reduced-motion: no-preference)',
        },
        (ctx) => {
          if (ctx.conditions?.reduceMotion) {
            gsap.set([backdropRef.current, dialogRef.current], { autoAlpha: 1 });
            gsap.set('[data-guide-section]', { autoAlpha: 1, y: 0 });
            return;
          }
          const tl = gsap.timeline();
          tl.fromTo(
            backdropRef.current,
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: DURATION.base, ease: EASE.enter },
          )
            .fromTo(
              dialogRef.current,
              { autoAlpha: 0, y: -20, scale: 0.95 },
              {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                duration: DURATION.base,
                ease: EASE.emphasize,
              },
              '-=0.05',
            )
            .fromTo(
              '[data-guide-section]',
              { autoAlpha: 0, y: 12 },
              {
                autoAlpha: 1,
                y: 0,
                duration: DURATION.slow,
                stagger: STAGGER.relaxed,
                ease: EASE.enter,
              },
              '-=0.1',
            );
        },
      );
      return () => mm.revert();
    },
    { scope: backdropRef },
  );

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[90] flex items-start justify-center bg-black/30 p-4 pt-24"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      <div ref={dialogRef} className="w-full max-w-2xl rounded-xl border bg-background shadow-2xl">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">{content.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{content.purpose}</p>
        </div>

        <div className="space-y-4 px-6 py-5">
          <section data-guide-section>
            <h3 className="text-sm font-semibold mb-2">主要功能</h3>
            <ol className="ml-4 list-decimal space-y-1.5 text-sm text-foreground">
              {content.features.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ol>
          </section>

          {content.workflow ? (
            <section data-guide-section className="rounded border bg-muted/30 p-3 text-sm">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-1">操作流程</h3>
              <p className="font-mono text-xs">{content.workflow}</p>
            </section>
          ) : null}

          {content.tip ? (
            <section data-guide-section className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              {content.tip}
            </section>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t bg-muted/20 px-6 py-3">
          <p className="text-[10px] text-muted-foreground">
            提示：按右下「?」按鈕可隨時重看本引導
          </p>
          <button
            onClick={onDismiss}
            className="rounded bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground"
          >
            我知道了、開始使用
          </button>
        </div>
      </div>
    </div>
  );
}

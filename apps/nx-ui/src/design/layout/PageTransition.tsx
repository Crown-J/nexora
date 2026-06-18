// apps/nx-ui/src/design/layout/PageTransition.tsx
// 2026-06-18 頁面切換轉場動畫（對齊 demo NEXORA 系統.html 的 staggered card-in 範式）
//   - 進場:opacity 0→1 + translateY 14→0 + scale 0.97→1 + 直接子元素 stagger
//   - 出場:opacity 1→0 + scale 0.99（短暫淡出、避免雙頁重疊）
//   - cubic-bezier(.2, .75, .2, 1) 與 demo .greet/.card 動畫曲線一致
//   - key={pathname}:next.js router 切頁 re-mount 整段、播一次進場動畫
//   - prefers-reduced-motion:framer-motion 自動關閉動畫（透過 reducedMotion 選項）
'use client';

import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const PAGE_VARIANTS = {
  enter: {
    opacity: 0,
    y: 14,
    scale: 0.97,
  },
  center: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.35,
      ease: [0.2, 0.75, 0.2, 1] as const,
      when: 'beforeChildren' as const,
      staggerChildren: 0.06,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.99,
    transition: { duration: 0.18, ease: 'easeIn' as const },
  },
};

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/';
  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          variants={PAGE_VARIANTS}
          initial="enter"
          animate="center"
          exit="exit"
          className="flex min-h-0 flex-1 flex-col"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}

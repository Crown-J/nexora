// apps/nx-ui/src/design/layout/PageTransition.tsx
// 2026-06-19 頁面切換轉場動畫 v2:散開→聚集視覺
//
// 視覺設計（執行長範式:元件散開→聚集）
//   - 舊頁出場:scale 1→1.3 + blur 0→14px + opacity 1→0（向觀者飛來放大模糊散出畫面）
//   - 新頁進場:scale 0.55→1 + blur 14→0 + opacity 0→1（從遠處聚焦聚攏成形）
//   + 直接子元素 stagger（PageHeader / MasterPageHead / ErpToolbar / SearchPanel
//     / MasterTable 等依序由小到大 + 淡入、形成「散件聚集」節奏）
//
// 曲線:
//   - 進場 easeOutExpo [0.16, 1, 0.3, 1]:前段快速放大聚焦、後段慢慢落定
//   - 出場 easeInExpo  [0.7, 0, 0.84, 0]:前段慢、尾段快速消散
//
// 行為:
//   - key={pathname}:next.js router 切頁 re-mount 整段、播一次進出動畫
//   - AnimatePresence mode="wait":舊頁完整退場才放新頁、避免重疊
//   - MotionConfig reducedMotion="user":尊重系統 prefers-reduced-motion
//   - transform-origin center:scale 從中心發散、視覺最自然
'use client';

import { AnimatePresence, MotionConfig, motion, type Variants } from 'framer-motion';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const PAGE_VARIANTS: Variants = {
  enter: {
    opacity: 0,
    scale: 0.55,
    filter: 'blur(14px)',
  },
  center: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1] as const, // easeOutExpo
      when: 'beforeChildren' as const,
      staggerChildren: 0.07,
      delayChildren: 0.06,
    },
  },
  exit: {
    opacity: 0,
    scale: 1.3,
    filter: 'blur(14px)',
    transition: {
      duration: 0.3,
      ease: [0.7, 0, 0.84, 0] as const, // easeInExpo
    },
  },
};

// 直接子元素的個別 stagger 動畫:由小縮放 + 偏移 + 淡入、模擬「聚集」過程
const CHILD_VARIANTS: Variants = {
  enter: { opacity: 0, scale: 0.85, y: 18 },
  center: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
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
          className="flex min-h-0 flex-1 flex-col will-change-[transform,filter,opacity] [transform-origin:center]"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}

/** 直接子元素 wrapper:用在共用 shell 內、讓 PageHeader/Toolbar/Table 等被
 *  parent variants 帶動 staggered scale + fade 進場（執行長範式「元件散開聚集」）
 *  用法:把主檔頁的最外層 div 改成 PageTransitionItem 或在內部各區塊包此元件 */
export function PageTransitionItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={CHILD_VARIANTS} className={className}>
      {children}
    </motion.div>
  );
}

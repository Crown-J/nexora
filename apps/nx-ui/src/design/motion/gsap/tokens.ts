// apps/nx-ui/src/design/motion/gsap/tokens.ts
// 動畫 token 常數（GSAP / framer-motion 共用）。規範見 docs/_team/animation-spec.md §2。

export const DURATION = {
  fast: 0.12,
  base: 0.2,
  slow: 0.4,
  dramatic: 0.8,
} as const;

export const EASE = {
  standard: 'power2.out',
  enter: 'power3.out',
  exit: 'power3.in',
  emphasize: 'back.out(1.4)',
} as const;

export const STAGGER = {
  tight: 0.03,
  relaxed: 0.08,
} as const;

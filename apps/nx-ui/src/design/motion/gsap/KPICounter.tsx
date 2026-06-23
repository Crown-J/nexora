// apps/nx-ui/src/design/motion/gsap/KPICounter.tsx
// KPI 數字 0 → target 滾動進場；reduce-motion 直接顯示終值。
// 規範見 docs/_team/animation-spec.md §1（7 個 GSAP 場景之一）。
'use client';

import { useRef, useState } from 'react';
import { gsap, useGSAP } from './register';
import { DURATION, EASE } from './tokens';

type Props = {
  value: number;
  /** 自訂格式 fn；有給就忽略 decimals / thousands / prefix / suffix */
  formatter?: (n: number) => string;
  /** 小數位數，預設 0 */
  decimals?: number;
  /** 是否加千分位逗號，預設 true */
  thousands?: boolean;
  /** 動畫時長秒數，預設 DURATION.dramatic */
  duration?: number;
  /** 進場是否從 0 開始；false = 從目前值改到新值。預設 true */
  fromZero?: boolean;
  /** 前綴（例：$） */
  prefix?: string;
  /** 後綴（例：元、% ） */
  suffix?: string;
  className?: string;
};

function defaultFormat(n: number, decimals: number, thousands: boolean): string {
  const fixed = n.toFixed(decimals);
  if (!thousands) return fixed;
  const [intPart, decPart] = fixed.split('.');
  const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart === undefined ? withSep : `${withSep}.${decPart}`;
}

export function KPICounter({
  value,
  formatter,
  decimals = 0,
  thousands = true,
  duration = DURATION.dramatic,
  fromZero = true,
  prefix = '',
  suffix = '',
  className,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const fmt = (n: number) =>
    formatter ? formatter(n) : `${prefix}${defaultFormat(n, decimals, thousands)}${suffix}`;
  const [display, setDisplay] = useState<string>(fmt(fromZero ? 0 : value));
  const lastValueRef = useRef<number>(fromZero ? 0 : value);

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
            setDisplay(fmt(value));
            lastValueRef.current = value;
            return;
          }
          const obj = { v: lastValueRef.current };
          gsap.to(obj, {
            v: value,
            duration,
            ease: EASE.standard,
            onUpdate: () => {
              setDisplay(fmt(obj.v));
            },
            onComplete: () => {
              lastValueRef.current = value;
              setDisplay(fmt(value));
            },
          });
        },
      );
      return () => mm.revert();
    },
    { scope: ref, dependencies: [value, formatter, decimals, thousands, duration, prefix, suffix] },
  );

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}

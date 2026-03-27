'use client';

import { cn } from '@/lib/utils';

type BrandPlanetLogoProps = {
  className?: string;
};

/**
 * 輕量品牌 Logo（極簡靜態版）
 * 對齊使用者偏好的第二版：簡潔圓環 + 單主軌道 + 金色核心。
 */
export function BrandPlanetLogo({ className }: BrandPlanetLogoProps) {
  return (
    <div className={cn('relative h-10 w-10', className)} aria-hidden>
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(244,180,0,0.15)_0%,rgba(244,180,0,0.01)_65%,transparent_100%)]" />

      <div className="absolute inset-[7px] rounded-full border border-amber-300/35 bg-[radial-gradient(circle_at_35%_30%,#ffd774_0%,#d89b1f_48%,#6b4a13_100%)] shadow-[0_0_10px_rgba(244,180,0,0.26)]">
        <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f4b400] shadow-[0_0_7px_rgba(244,180,0,0.95)]" />
      </div>

      <svg className="absolute inset-0" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="18.5" stroke="rgba(244,180,0,0.2)" />
        <ellipse
          cx="20"
          cy="20"
          rx="14.5"
          ry="7.2"
          transform="rotate(20 20 20)"
          stroke="rgba(245, 220, 170, 0.35)"
        />
      </svg>

      <span className="pointer-events-none absolute right-[6px] top-[11px] h-1.5 w-1.5 rounded-full bg-[#f6c94b] shadow-[0_0_7px_rgba(246,201,75,0.88)]" />
      <span className="pointer-events-none absolute left-[15px] top-[5px] h-1 w-1 rounded-full bg-amber-100/80" />
    </div>
  );
}

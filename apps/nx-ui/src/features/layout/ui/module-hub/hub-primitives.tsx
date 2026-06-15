/**
 * @FUNCTION_CODE NX00-UI-MODULE-HUB-001-F01
 * 五大中心 Hub 卡片共用元件（版型對齊主檔中心 `/dashboard/base`）
 */

'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';

import { hubCardShellBaseClass } from '@design/utils/hubCardDimensions';
import { cx } from '@design/utils/cx';

/** DEMO 主線前，卡片暫導向此頁 */
export const HUB_PLACEHOLDER_HREF = '/coming-soon';

export function hubShellMotion(): string {
  return cx(
    'transition-all duration-300 ease-out',
    'hover:-translate-y-0.5 hover:scale-[1.01] hover:border-primary/35 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]',
  );
}

/**
 * STEP 整數：金色底；STEP 1.5 / 2.5：金邊透明底（支線）
 */
export function HubStepBadge({ label }: { label: string }) {
  const isHalf = /\d\.\d/.test(label);
  return (
    <span
      className={cx(
        'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide',
        isHalf
          ? 'border border-[#E8A020]/80 bg-transparent text-[#E8A020]'
          : 'bg-[#E8A020]/90 text-black',
      )}
    >
      {label}
    </span>
  );
}

/**
 * [4-2] 2026-06-05：PRO 鎖頭徽章對齊「不出現鎖頭、不出現灰卡」（NX-MANUAL-02 v2.0 §④）。
 * 元件保留 export 不破壞既有 import、實際內容改 null。
 */
export function HubProBadge() {
  return null;
}

export function ModuleHubSection({
  sectionId,
  title,
  count,
  children,
}: {
  sectionId: string;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4" aria-label={title}>
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/70 pb-2">
        <h2 className="text-sm font-semibold tracking-wide text-foreground" data-section-id={sectionId}>
          {title}
        </h2>
        <span className="text-[11px] text-muted-foreground tabular-nums">{count} 項</span>
      </div>
      {/* 手機：grid 1→2 欄；桌面：保留原 flex-wrap + 卡片固定 220px（R4-C） */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-start lg:gap-6">
        {children}
      </div>
    </section>
  );
}

export function HubLinkCard({
  href = HUB_PLACEHOLDER_HREF,
  title,
  description,
  Icon,
  stepLabel,
  pro,
}: {
  href?: string;
  title: string;
  description: string;
  Icon: LucideIcon;
  stepLabel?: string;
  pro?: boolean;
}) {
  const motion = hubShellMotion();

  // [4-2] 2026-06-05：PRO 卡「升級後解鎖」alert / 灰階對齊不出現推銷字眼（NX-MANUAL-02 v2.0 §④）。
  // pro prop 保留供未來真接 plan filter 後使用、目前 noop。

  return (
    <Link
      href={href}
      className={cx(
        hubCardShellBaseClass,
        // 手機 full width 覆寫原本的 w-[220px]；桌面 lg+ 回到 220px 固定寬（R4-C）
        '!w-full lg:!w-[220px]',
        'group flex flex-col',
        motion,
        'active:scale-[0.998]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-2">
        <div
          className={cx(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/80',
            'bg-secondary/50 text-primary',
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {stepLabel ? <HubStepBadge label={stepLabel} /> : null}
          <ChevronRight
            className={cx(
              'h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all duration-300',
              'group-hover:translate-x-0.5 group-hover:opacity-100',
            )}
            aria-hidden
          />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-1 pt-1.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{title}</h3>
        <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}

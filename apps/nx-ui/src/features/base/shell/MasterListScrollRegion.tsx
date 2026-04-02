/**
 * 主檔列表橫向／直向捲動區：套用 nx-master-scroll（自訂細捲軸、淺／深色 token）。
 * USER／ROLE／PART 等置中彈窗主檔共用。
 */

'use client';

import type { RefObject, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const NX_MASTER_LIST_SCROLL_CLASS =
  'nx-master-scroll min-h-0 min-w-0 flex-1 overflow-auto overscroll-x-contain rounded-md pr-2 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40';

export type MasterListScrollRegionProps = {
  scrollRef: RefObject<HTMLDivElement | null>;
  ariaLabel: string;
  children: ReactNode;
  className?: string;
};

export function MasterListScrollRegion({ scrollRef, ariaLabel, children, className }: MasterListScrollRegionProps) {
  return (
    <div ref={scrollRef} tabIndex={-1} role="region" aria-label={ariaLabel} className={cn(NX_MASTER_LIST_SCROLL_CLASS, className)}>
      {children}
    </div>
  );
}

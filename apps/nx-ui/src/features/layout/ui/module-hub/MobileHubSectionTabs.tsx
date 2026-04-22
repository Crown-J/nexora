// apps/nx-ui/src/features/layout/ui/module-hub/MobileHubSectionTabs.tsx
/**
 * 各中心 Hub 頁手機版底部群組 Tab（通用版）。
 *
 * 取代全站 MobileDock，讓手機版用底部 Tab 切換各中心內的 section。
 * Usage：
 *   <MobileHubSectionTabs tabs={PURCHASE_TABS} activeId={active} onChange={setActive} />
 *
 * 由 R3 的 base-specific MobileSectionTabs 抽象而來（R4-C）。
 */

'use client';

import type { LucideIcon } from 'lucide-react';

import { cx } from '@/shared/lib/cx';

export type MobileHubSectionTabDef = {
  id: string;
  label: string;
  Icon: LucideIcon;
};

export type MobileHubSectionTabsProps = {
  tabs: readonly MobileHubSectionTabDef[];
  activeId: string;
  onChange: (id: string) => void;
  /** 自訂 aria-label；預設「群組切換」 */
  ariaLabel?: string;
};

export function MobileHubSectionTabs({
  tabs,
  activeId,
  onChange,
  ariaLabel = '群組切換',
}: MobileHubSectionTabsProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className={cx(
        'lg:hidden',
        'fixed bottom-0 left-0 right-0 z-40',
        'h-14 border-t border-white/10 bg-black/95 backdrop-blur',
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <div className="flex h-full items-stretch">
        {tabs.map(({ id, label, Icon }) => {
          const isActive = activeId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              title={label}
              className={cx(
                'relative flex min-h-[56px] min-w-[44px] flex-1 flex-col items-center justify-center',
                'transition-colors',
                isActive ? 'text-[#E8A020]' : 'text-white/60 hover:text-white/80',
              )}
            >
              <Icon className="h-6 w-6" aria-hidden />
              {isActive ? (
                <span
                  aria-hidden
                  className="absolute bottom-1 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-[#E8A020]"
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

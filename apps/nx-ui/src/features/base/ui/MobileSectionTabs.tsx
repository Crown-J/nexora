// apps/nx-ui/src/features/base/ui/MobileSectionTabs.tsx
/**
 * 主檔中心手機底部群組 Tab（取代全站 MobileDock 在 /dashboard/base）
 *
 * - 桌面（lg+）隱藏，手機固定底部 56px 高
 * - 6 個 section tab 對應 MASTER_HUB_SECTION_ORDER（加 vehicle 車型字典）
 * - 選中態：金色 icon + 底部橫槓
 */

'use client';

import type { LucideIcon } from 'lucide-react';
import { Users, Package, Car, Building2, Handshake, Settings } from 'lucide-react';

import { cx } from '@/shared/lib/cx';

import {
  MASTER_HUB_SECTION_ORDER,
  MASTER_HUB_SECTION_TITLES,
  type MasterHubSectionId,
} from '../config/master-cards';

type SectionTabProps = {
  activeSection: MasterHubSectionId;
  onSectionChange: (section: MasterHubSectionId) => void;
};

const TAB_ICONS: Record<MasterHubSectionId, LucideIcon> = {
  account: Users,
  product: Package,
  vehicle: Car,
  organization: Building2,
  partner: Handshake,
  system: Settings,
};

export function MobileSectionTabs({ activeSection, onSectionChange }: SectionTabProps) {
  return (
    <nav
      aria-label="主檔群組切換"
      className={cx(
        'lg:hidden',
        'fixed bottom-0 left-0 right-0 z-40',
        'h-14 border-t border-white/10 bg-black/95 backdrop-blur',
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <div className="flex h-full items-stretch">
        {MASTER_HUB_SECTION_ORDER.map((id) => {
          const Icon = TAB_ICONS[id];
          const label = MASTER_HUB_SECTION_TITLES[id];
          const isActive = activeSection === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSectionChange(id)}
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

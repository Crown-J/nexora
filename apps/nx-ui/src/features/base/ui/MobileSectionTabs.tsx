// apps/nx-ui/src/features/base/ui/MobileSectionTabs.tsx
/**
 * 主檔中心手機底部群組 Tab（業界改革 #22 v1.2 + #17）
 *
 * - 桌面（lg+）隱藏、手機固定底部
 * - 6 個 section flex-1 均分（透過 NexoraBottomDock）
 * - icon-only（aria-label / title 提供無障礙）
 * - 對齊統一範式：shared/ui/NexoraBottomDock.tsx
 */

'use client';

import type { LucideIcon } from 'lucide-react';
import { Users, Package, Car, Building2, Handshake, Settings } from 'lucide-react';

import { NexoraBottomDock, type DockItem } from '@/shared/ui/NexoraBottomDock';

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
  const items: DockItem[] = MASTER_HUB_SECTION_ORDER.map((id) => ({
    id,
    icon: TAB_ICONS[id],
    label: MASTER_HUB_SECTION_TITLES[id],
    onClick: () => onSectionChange(id),
    active: activeSection === id,
  }));
  return <NexoraBottomDock items={items} ariaLabel="主檔群組切換" />;
}

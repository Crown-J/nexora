// apps/nx-ui/src/features/base/shell/BaseMasterMobileDock.tsx
/**
 * 主檔子頁手機 Bottom Dock（業界改革 #22 v1.2 + #17）
 *
 * 對齊統一範式 shared/ui/NexoraBottomDock：
 * - 25 主檔 icon、icon-only、水平 swipe scroll（> 6 自動）
 * - active item（當前主檔）自動 scrollTo 中央
 *
 * 由 BaseMasterPageHeader 渲染、21 主檔 page.tsx 同步生效。
 */

'use client';

import { usePathname } from 'next/navigation';

import { getMasterHubSections } from '@/features/base/config/master-cards';
import { NexoraBottomDock, type DockItem } from '@/shared/ui/NexoraBottomDock';

function pathMatchesHub(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (pathname.startsWith(`${href}/`)) return true;
  return false;
}

export function BaseMasterMobileDock() {
  const pathname = usePathname() || '';
  const allCards = getMasterHubSections().flatMap((g) => g.cards);
  const items: DockItem[] = allCards.map((card) => ({
    id: card.id,
    icon: card.icon,
    label: card.title,
    href: card.href,
    active: pathMatchesHub(pathname, card.href),
  }));
  return <NexoraBottomDock items={items} ariaLabel="主檔快速切換（手機）" />;
}

// apps/nx-ui/src/features/layout/ui/MobileWorkstationDock.tsx
// v1.2 §10.1 §10.2 §10.3：手機底部 5 工作站 dock
//
// 範式：
// - 5 工作站：驗收 / 撿貨 / 包貨 / 配送 / 盤點（blueprint §10.3 對應）
// - Alex Q3=a 拍板：全 dashboard 顯示、所有員工都看到、點進去無權限再擋（對齊 §10.5）
// - lg:hidden（手機才顯示）+ 既有 NexoraBottomDock 元件（portal、bottom-0、56px）
// - 不接權限過濾（dock 永遠 5 項、權限在子頁攔）
'use client';

import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { CheckCircle2, ClipboardList, Package, ScanBarcode, Truck } from 'lucide-react';

import { NexoraBottomDock, type DockItem } from '@/shared/ui/NexoraBottomDock';

interface Workstation {
  key: string;
  href: string;
  label: string;
  icon: LucideIcon;
}

const WORKSTATIONS: ReadonlyArray<Workstation> = [
  { key: 'receiving', href: '/dashboard/inventory/receiving', label: '驗收', icon: CheckCircle2 },
  { key: 'picking',   href: '/dashboard/inventory/picking',   label: '撿貨', icon: ScanBarcode },
  { key: 'packing',   href: '/dashboard/inventory/packing',   label: '包貨', icon: Package },
  { key: 'delivery',  href: '/dashboard/inventory/delivery',  label: '配送', icon: Truck },
  { key: 'stocktake', href: '/dashboard/inventory/stocktake', label: '盤點', icon: ClipboardList },
];

export function MobileWorkstationDock() {
  const pathname = usePathname() ?? '';

  const items: DockItem[] = WORKSTATIONS.map((w) => ({
    id: w.key,
    icon: w.icon,
    label: w.label,
    href: w.href,
    active: pathname === w.href || pathname.startsWith(w.href + '/'),
  }));

  return <NexoraBottomDock items={items} ariaLabel="工作站快速切換" />;
}

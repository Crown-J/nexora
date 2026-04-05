/**
 * File: apps/nx-ui/src/features/layout/config/menu.nx01.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01 進／退貨作業側邊選單（占位）
 */

import type { SideMenuGroup } from '@/features/layout/config/menu.nx00';

export function getNx01SideMenu(): SideMenuGroup[] {
  return [
    {
      group: '進／退貨作業',
      items: [
        { key: 'nx01.home', label: '採購作業總覽', href: '/dashboard/nx01' },
        { key: 'nx01.rfq', label: '詢價 RFQ', href: '/dashboard/nx01/rfq' },
        { key: 'nx01.po', label: '採購 PO（PLUS）', href: '/dashboard/nx01/po' },
        { key: 'nx01.rr', label: '進貨 RR', href: '/dashboard/nx01/rr' },
        { key: 'nx01.pr', label: '退貨 PR', href: '/dashboard/nx01/pr' },
        { key: 'nx01.stock-replenishment', label: '庫存補貨流程', href: '/dashboard/nx01/stock-replenishment' },
      ],
    },
  ];
}

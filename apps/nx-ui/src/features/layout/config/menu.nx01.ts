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
        { key: 'nx01.home', label: '模組首頁', href: '/dashboard/nx01' },
        { key: 'nx01.stock-replenishment', label: '庫存補貨流程', href: '/dashboard/nx01/stock-replenishment' },
      ],
    },
  ];
}

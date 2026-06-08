/**
 * File: apps/nx-ui/src/features/layout/config/menu.nx03.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 舊銷售管理側邊選單（F1-B 銷貨路徑收斂 2026-06-08：URL 改 /dashboard/sale/* 不露 nx 代碼）
 */

import type { SideMenuGroup } from '@/features/layout/config/menu.base';

export function getNx03SideMenu(): SideMenuGroup[] {
  return [
    {
      group: '銷售管理',
      items: [
        { key: 'sales.so',       label: '銷貨單工作台',          href: '/dashboard/sale/so' },
        { key: 'sales.return',   label: '銷退單工作台',          href: '/dashboard/sale/return' },
        { key: 'sales.customer', label: '客戶主檔',              href: '/dashboard/base/partners' },
      ],
    },
  ];
}

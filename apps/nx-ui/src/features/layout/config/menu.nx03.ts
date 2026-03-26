/**
 * File: apps/nx-ui/src/features/layout/config/menu.nx03.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX03 銷售作業側邊選單（占位）
 */

import type { SideMenuGroup } from '@/features/layout/config/menu.nx00';

export function getNx03SideMenu(): SideMenuGroup[] {
  return [
    {
      group: '銷售作業',
      items: [
        { key: 'nx03.home', label: '模組首頁', href: '/dashboard/nx03' },
        { key: 'nx03.customer-sales', label: '客戶銷貨流程', href: '/dashboard/nx03/customer-sales' },
      ],
    },
  ];
}

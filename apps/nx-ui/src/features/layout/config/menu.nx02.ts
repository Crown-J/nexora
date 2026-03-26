/**
 * File: apps/nx-ui/src/features/layout/config/menu.nx02.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02 庫存管理側邊選單（占位）
 */

import type { SideMenuGroup } from '@/features/layout/config/menu.nx00';

export function getNx02SideMenu(): SideMenuGroup[] {
  return [
    {
      group: '庫存管理',
      items: [{ key: 'nx02.home', label: '模組首頁', href: '/dashboard/nx02' }],
    },
  ];
}

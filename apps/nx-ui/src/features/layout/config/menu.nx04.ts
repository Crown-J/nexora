/**
 * File: apps/nx-ui/src/features/layout/config/menu.nx04.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX04 財務管理側邊選單（占位）
 */

import type { SideMenuGroup } from '@/features/layout/config/menu.nx00';

export function getNx04SideMenu(): SideMenuGroup[] {
  return [
    {
      group: '財務管理',
      items: [{ key: 'nx04.home', label: '模組首頁', href: '/dashboard/nx04' }],
    },
  ];
}

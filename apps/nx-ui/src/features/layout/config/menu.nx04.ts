/**
 * File: apps/nx-ui/src/features/layout/config/menu.nx04.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX05 財務管理側邊選單
 *
 * Notes:
 * - 路由 v2.0：/dashboard/finance/*
 */

import type { SideMenuGroup } from '@/features/layout/config/menu.nx00';

export function getNx04SideMenu(): SideMenuGroup[] {
  return [
    {
      group: '財務管理',
      items: [
        { key: 'finance.home',      label: '財務模組首頁',   href: '/dashboard/finance' },
        { key: 'finance.workspace', label: '財務作業工作台', href: '/dashboard/finance/workspace' },
      ],
    },
  ];
}

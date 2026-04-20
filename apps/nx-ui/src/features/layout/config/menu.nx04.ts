/**
 * File: apps/nx-ui/src/features/layout/config/menu.nx04.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX05 財務管理側邊選單
 *
 * Notes:
 * - TASK-0420 v2：NX05 財務管理 → /dashboard/nx05/*
 */

import type { SideMenuGroup } from '@/features/layout/config/menu.nx00';

export function getNx04SideMenu(): SideMenuGroup[] {
  return [
    {
      group: '財務管理',
      items: [
        { key: 'finance.home',      label: '財務模組首頁',   href: '/dashboard/nx05/workspace' },
        { key: 'finance.workspace', label: '財務作業工作台', href: '/dashboard/nx05/workspace' },
      ],
    },
  ];
}

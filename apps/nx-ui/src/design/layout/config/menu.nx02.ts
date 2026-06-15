/**
 * File: apps/nx-ui/src/features/layout/config/menu.nx02.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX03 庫存管理側邊選單
 *
 * Notes:
 * - TASK-0420 v2：NX03 庫存管理 → /dashboard/inventory/*
 */

import type { SideMenuGroup } from '@design/layout/config/menu.base';

export function getNx02SideMenu(): SideMenuGroup[] {
  return [
    {
      group: '庫存管理',
      items: [
        { key: 'inventory.home',      label: '庫存模組首頁',     href: '/dashboard/inventory/workspace' },
        { key: 'inventory.workspace', label: '庫存作業工作台',   href: '/dashboard/inventory/workspace' },
        { key: 'inventory.setting',   label: '庫位與安全量',     href: '/dashboard/inventory/warehouse-setting' },
      ],
    },
  ];
}

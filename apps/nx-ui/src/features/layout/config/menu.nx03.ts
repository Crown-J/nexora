/**
 * File: apps/nx-ui/src/features/layout/config/menu.nx03.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX04 銷售管理側邊選單
 *
 * Notes:
 * - TASK-0420 v2：NX04 銷售管理 → /dashboard/nx04/*
 */

import type { SideMenuGroup } from '@/features/layout/config/menu.nx00';

export function getNx03SideMenu(): SideMenuGroup[] {
  return [
    {
      group: '銷售管理',
      items: [
        { key: 'sales.home',     label: '銷售模組首頁',         href: '/dashboard/nx04/domestic' },
        { key: 'sales.domestic', label: '國內銷售作業',         href: '/dashboard/nx04/domestic' },
        { key: 'sales.export',   label: '國外銷售作業（PLUS）', href: '/dashboard/nx04/export' },
        { key: 'sales.customer', label: '客戶管理',             href: '/dashboard/nx04/customer' },
      ],
    },
  ];
}

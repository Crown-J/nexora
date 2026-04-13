/**
 * File: apps/nx-ui/src/features/layout/config/menu.nx03.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX04 銷售管理側邊選單
 *
 * Notes:
 * - 路由 v2.0：/dashboard/sales/*
 */

import type { SideMenuGroup } from '@/features/layout/config/menu.nx00';

export function getNx03SideMenu(): SideMenuGroup[] {
  return [
    {
      group: '銷售管理',
      items: [
        { key: 'sales.home',     label: '銷售模組首頁',         href: '/dashboard/sales' },
        { key: 'sales.domestic', label: '國內銷售作業',         href: '/dashboard/sales/domestic' },
        { key: 'sales.export',   label: '國外銷售作業（PLUS）', href: '/dashboard/sales/export' },
        { key: 'sales.customer', label: '客戶管理',             href: '/dashboard/sales/customer' },
      ],
    },
  ];
}

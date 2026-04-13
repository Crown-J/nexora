/**
 * File: apps/nx-ui/src/features/layout/config/menu.nx01.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02 採購管理側邊選單
 *
 * Notes:
 * - 路由 v2.0：/dashboard/purchase/*
 */

import type { SideMenuGroup } from '@/features/layout/config/menu.nx00';

export function getNx01SideMenu(): SideMenuGroup[] {
  return [
    {
      group: '採購管理',
      items: [
        { key: 'purchase.home',     label: '採購模組首頁',         href: '/dashboard/purchase' },
        { key: 'purchase.domestic', label: '國內採購作業',         href: '/dashboard/purchase/domestic' },
        { key: 'purchase.import',   label: '國外採購作業（PLUS）', href: '/dashboard/purchase/import' },
        { key: 'purchase.special',  label: '特殊採購（掃貨）',     href: '/dashboard/purchase/special' },
        { key: 'purchase.product',  label: '產品管理',             href: '/dashboard/purchase/product' },
        { key: 'purchase.vendor',   label: '廠商管理',             href: '/dashboard/purchase/vendor' },
      ],
    },
  ];
}

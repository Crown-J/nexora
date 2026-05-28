/**
 * File: apps/nx-ui/src/features/layout/config/menu.nx04.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX04 銷貨管理側邊選單
 *
 * Notes:
 * - TASK-NX04-IMPL-01 Phase 6（Crown Q-X1=A 拍板）：修正 audit-01 §3.4 揭露的 drift
 *   既有 stale 內容：「NX05 財務管理」+ href 全指 /dashboard/nx05/*（pivot 後未改）
 *   修正後：內容對齊 NX04 銷貨、href 指 /dashboard/nx04/*
 * - 對齊 nx04 dashboard 3 placeholder（customer / domestic / export）
 */

import type { SideMenuGroup } from '@/features/layout/config/menu.base';

export function getNx04SideMenu(): SideMenuGroup[] {
  return [
    {
      group: '銷貨管理',
      items: [
        { key: 'sales.home',      label: '銷貨模組首頁',     href: '/dashboard/nx04' },
        { key: 'sales.domestic',  label: '銷貨作業工作台',   href: '/dashboard/nx04/domestic' },
        { key: 'sales.return',    label: '銷退處理工作台',   href: '/dashboard/nx04/export' },
        { key: 'sales.customer',  label: '客戶管理工作台',   href: '/dashboard/nx04/customer' },
      ],
    },
  ];
}

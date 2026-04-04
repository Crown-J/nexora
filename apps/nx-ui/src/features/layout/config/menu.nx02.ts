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
      items: [
        { key: 'nx02.home', label: '模組首頁', href: '/dashboard/nx02' },
        { key: 'nx02.balance', label: '庫存一覽', href: '/dashboard/nx02/balance' },
        { key: 'nx02.ledger', label: '庫存台帳', href: '/dashboard/nx02/ledger' },
        { key: 'nx02.init', label: '開帳存', href: '/dashboard/nx02/init' },
        { key: 'nx02.stock-setting', label: '庫存設定', href: '/dashboard/nx02/stock-setting' },
        { key: 'nx02.stock-take', label: '盤點單', href: '/dashboard/nx02/stock-take' },
        { key: 'nx02.transfer', label: '調撥單', href: '/dashboard/nx02/transfer' },
        { key: 'nx02.shortage', label: '缺貨簿', href: '/dashboard/nx02/shortage' },
        { key: 'nx02.auto-replenish', label: '自動補貨', href: '/dashboard/nx02/auto-replenish' },
      ],
    },
  ];
}

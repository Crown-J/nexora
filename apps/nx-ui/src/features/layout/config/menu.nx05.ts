/**
 * File: apps/nx-ui/src/features/layout/config/menu.nx05.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX05 財務管理側邊選單
 *
 * Notes:
 * - TASK-NX05-IMPL-01 Phase 5（audit-01 §3.4 揭露既有 0 個 menu.nx05.ts、本軌建立）
 * - 對齊 nx05 dashboard 5 placeholder（workspace + ap + ar + allowance + closing）
 * - 對齊 menu.nx02.ts / menu.nx03.ts 範式（group + items）
 */

import type { SideMenuGroup } from '@/features/layout/config/menu.base';

export function getNx05SideMenu(): SideMenuGroup[] {
  return [
    {
      group: '財務管理',
      items: [
        { key: 'finance.home',      label: '財務模組首頁',     href: '/dashboard/nx05/workspace' },
        { key: 'finance.workspace', label: '財務工作台',       href: '/dashboard/nx05/workspace' },
        { key: 'finance.ar',        label: '應收帳款工作台',   href: '/dashboard/nx05/ar' },
        { key: 'finance.ap',        label: '應付帳款工作台',   href: '/dashboard/nx05/ap' },
        { key: 'finance.allowance', label: '折讓單工作台',     href: '/dashboard/nx05/allowance' },
        { key: 'finance.closing',   label: '關帳工作台',       href: '/dashboard/nx05/closing' },
      ],
    },
  ];
}

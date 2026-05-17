/**
 * File: apps/nx-ui/src/features/layout/config/menu.nx06.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX06 物流管理側邊選單
 *
 * Notes:
 * - TASK-NX06-IMPL-01 Phase 5（audit-01 §3.4 揭露既有 0 個 menu.nx06.ts、本軌建立）
 * - 對齊 nx06 dashboard 5 placeholder（workspace + dispatch + sign + cost + exception）
 * - 對齊 menu.nx05.ts / menu.nx04.ts 範式（group + items）
 */

import type { SideMenuGroup } from '@/features/layout/config/menu.nx00';

export function getNx06SideMenu(): SideMenuGroup[] {
  return [
    {
      group: '物流管理',
      items: [
        { key: 'logistics.home',      label: '物流模組首頁',     href: '/dashboard/nx06/workspace' },
        { key: 'logistics.workspace', label: '物流工作台',       href: '/dashboard/nx06/workspace' },
        { key: 'logistics.dispatch',  label: '配單工作台',       href: '/dashboard/nx06/dispatch' },
        { key: 'logistics.sign',      label: '電子簽收工作台',   href: '/dashboard/nx06/sign' },
        { key: 'logistics.exception', label: '物流異常工作台',   href: '/dashboard/nx06/exception' },
        { key: 'logistics.cost',      label: '配送成本工作台',   href: '/dashboard/nx06/cost' },
      ],
    },
  ];
}

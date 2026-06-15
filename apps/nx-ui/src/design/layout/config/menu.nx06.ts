/**
 * File: apps/nx-ui/src/features/layout/config/menu.nx06.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX06 物流管理側邊選單（IMPL-01 + IMPL-02 整合）
 *
 * Notes:
 * - TASK-NX06-IMPL-01 Phase 5：6 items（基礎物流工作台 workspace + dispatch + sign + exception + cost）
 * - TASK-NX06-IMPL-02 Phase 6：升 4 items（map + route + handover ⭐⭐⭐）+ 新 group 外務員 PWA 4 items
 * - 對齊 menu.nx05.ts / menu.nx04.ts 範式（group + items）
 */

import type { SideMenuGroup } from '@design/layout/config/menu.base';

export function getNx06SideMenu(): SideMenuGroup[] {
  return [
    {
      group: '物流管理（倉管組長）',
      items: [
        { key: 'logistics.home',      label: '物流模組首頁',     href: '/dashboard/delivery/workspace' },
        { key: 'logistics.workspace', label: '物流工作台',       href: '/dashboard/delivery/workspace' },
        { key: 'logistics.map',       label: '物流地圖視圖',     href: '/dashboard/delivery/map' },
        { key: 'logistics.route',     label: '路線優化工作台',   href: '/dashboard/delivery/route' },
        { key: 'logistics.handover',  label: '動態任務轉派 ⭐⭐⭐', href: '/dashboard/delivery/handover' },
        { key: 'logistics.dispatch',  label: '配單工作台',       href: '/dashboard/delivery/dispatch' },
        { key: 'logistics.sign',      label: '電子簽收工作台',   href: '/dashboard/delivery/sign' },
        { key: 'logistics.exception', label: '物流異常工作台',   href: '/dashboard/delivery/exception' },
        { key: 'logistics.cost',      label: '配送成本工作台',   href: '/dashboard/delivery/cost' },
      ],
    },
    {
      group: '外務員 PWA App',
      items: [
        { key: 'driver.home',     label: '外務員首頁',           href: '/dashboard/delivery/driver' },
        { key: 'driver.tasks',    label: '我的任務列表',         href: '/dashboard/delivery/driver/tasks' },
        { key: 'driver.map',      label: '地圖（自己 + 任務）',  href: '/dashboard/delivery/driver/map' },
        { key: 'driver.handover', label: '動態交接（接收）',     href: '/dashboard/delivery/driver/handover' },
      ],
    },
  ];
}

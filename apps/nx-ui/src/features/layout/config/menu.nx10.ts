/**
 * File: apps/nx-ui/src/features/layout/config/menu.nx10.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX10 八角遊戲化側邊選單（Crown 揭露 Yu-kai Chou 八角框架）
 *
 * Notes:
 * - TASK-NX10-IMPL-01 Phase 5：audit-01 §3.3 揭露既有 0 個 menu.nx10.ts、本軌建立
 * - 1 group 7 items（員工 self-view + HR_ADMIN 管理）
 * - 對齊 menu.nx05~nx09 範式
 * - 2 ⭐ 業界改革標：surprise-box（驅動力 #7）+ sprint（驅動力 #6）
 */

import type { SideMenuGroup } from '@/features/layout/config/menu.nx00';

export function getNx10SideMenu(): SideMenuGroup[] {
  return [
    {
      group: '八角遊戲化系統',
      items: [
        { key: 'gamif.home',         label: '遊戲化首頁',           href: '/dashboard/nx10/workspace' },
        { key: 'gamif.medals',       label: '勳章系統（20 levels）',   href: '/dashboard/nx10/medals' },
        { key: 'gamif.leaderboard',  label: '排行榜',                href: '/dashboard/nx10/leaderboard' },
        { key: 'gamif.tasks',        label: '任務系統（5 cycle）',    href: '/dashboard/nx10/tasks' },
        { key: 'gamif.surprise-box', label: '驚喜寶箱 ⭐ #7',        href: '/dashboard/nx10/surprise-box' },
        { key: 'gamif.sprint',       label: '衝刺挑戰 ⭐ #6',        href: '/dashboard/nx10/sprint' },
      ],
    },
  ];
}

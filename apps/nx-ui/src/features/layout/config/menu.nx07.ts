/**
 * File: apps/nx-ui/src/features/layout/config/menu.nx07.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX07 人資管理側邊選單
 *
 * Notes:
 * - TASK-NX07-IMPL-01 Phase 5：audit-01 §3.3 揭露既有 0 個 menu.nx07.ts、本軌建立
 * - 1 group 8 items（HR_ADMIN 主寫入者 + 業務員 self-view + 主管 cross-view）
 * - 對齊 menu.nx05 / nx06 / nx08 範式
 */

import type { SideMenuGroup } from '@/features/layout/config/menu.base';

export function getNx07SideMenu(): SideMenuGroup[] {
  return [
    {
      group: '人資管理',
      items: [
        { key: 'hr.home',       label: '人資管理首頁',         href: '/dashboard/hr/workspace' },
        { key: 'hr.employee',   label: '員工主檔',             href: '/dashboard/hr/employee' },
        { key: 'hr.department', label: '部門組織',             href: '/dashboard/hr/department' },
        { key: 'hr.attendance', label: '出勤打卡',             href: '/dashboard/hr/attendance' },
        { key: 'hr.leave',      label: '請假 / 加班',          href: '/dashboard/hr/leave' },
        { key: 'hr.salary',     label: '薪資 + KPI 獎金 ⭐⭐⭐', href: '/dashboard/hr/salary' },
        { key: 'hr.kpi',        label: 'KPI 業績考核',         href: '/dashboard/hr/kpi' },
        { key: 'hr.medical',    label: '醫療管理 + 職災 ⭐',   href: '/dashboard/hr/medical' },
      ],
    },
  ];
}

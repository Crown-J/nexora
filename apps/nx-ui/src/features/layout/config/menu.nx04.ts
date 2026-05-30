/**
 * File: apps/nx-ui/src/features/layout/config/menu.nx04.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX04 銷貨 LITE 側邊選單（M3 C7 整合 cleanup 更新）
 *
 * Notes:
 * - NX04-M3 C7 整合 cleanup：menu 對齊新建工作台
 *   舊 3 placeholder（customer / domestic / export）保留 + redirect、避免舊 bookmark 404
 *   新主鏈：QT → SO → SR + 客戶等級變更 + OWNER 待核可
 */

import type { SideMenuGroup } from '@/features/layout/config/menu.base';

export function getNx04SideMenu(): SideMenuGroup[] {
  return [
    {
      group: '銷貨 LITE',
      items: [
        { key: 'sales.home',          label: '銷貨模組首頁',     href: '/dashboard/nx04' },
        { key: 'sales.quote',         label: '報價單工作台 QT',  href: '/dashboard/nx04/quote' },
        { key: 'sales.so',            label: '銷貨單工作台 SO',  href: '/dashboard/nx04/sales-order' },
        { key: 'sales.sr',            label: '銷退單工作台 SR',  href: '/dashboard/nx04/sales-return' },
      ],
    },
    {
      group: '客戶 / 主管',
      items: [
        { key: 'sales.gradeHistory',  label: '客戶等級變更',     href: '/dashboard/nx04/partner-grade-history' },
        { key: 'sales.gradeApproval', label: '待核可清單（主管）', href: '/dashboard/owner/grade-approvals' },
        { key: 'sales.customer',      label: '客戶管理（FU）',   href: '/dashboard/nx04/customer' },
      ],
    },
    {
      group: '系統設定',
      items: [
        { key: 'sales.settings.roles', label: '角色與權限 ⭐ v1.2', href: '/dashboard/settings/roles' },
      ],
    },
  ];
}

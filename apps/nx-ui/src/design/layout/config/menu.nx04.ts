/**
 * File: apps/nx-ui/src/features/layout/config/menu.nx04.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX04 銷貨 LITE 側邊選單（F1-B 路徑收斂 2026-06-08：URL 改 /dashboard/sale/* 不露 nx 代碼）
 */

import type { SideMenuGroup } from '@design/layout/config/menu.base';

export function getNx04SideMenu(): SideMenuGroup[] {
  return [
    {
      group: '銷貨 LITE',
      items: [
        { key: 'sales.quote',         label: '報價單工作台 QT',    href: '/dashboard/sale/qt' },
        { key: 'sales.so',            label: '銷貨單工作台 SO',    href: '/dashboard/sale/so' },
        { key: 'sales.sr',            label: '銷退單工作台 SR',    href: '/dashboard/sale/return' },
      ],
    },
    {
      group: '客戶 / 主管',
      items: [
        { key: 'sales.gradeHistory',  label: '客戶分級沿革',       href: '/dashboard/sale/partner-grade-history' },
        { key: 'sales.gradeApproval', label: '待核可清單（主管）', href: '/dashboard/owner/grade-approvals' },
        { key: 'sales.customer',      label: '客戶主檔',           href: '/dashboard/base/partners' },
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

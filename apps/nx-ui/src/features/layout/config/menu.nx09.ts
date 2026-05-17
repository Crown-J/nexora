/**
 * File: apps/nx-ui/src/features/layout/config/menu.nx09.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX09 EIP 企業資訊平台側邊選單（Crown Q1=全要拍板）
 *
 * Notes:
 * - TASK-NX09-IMPL-01 Phase 6：audit-01 §3.3 揭露既有 0 個 menu.nx09.ts、本軌建立
 * - 1 group 7 items（EIP 統一入口）
 * - 對齊 menu.nx05 / nx06 / nx07 / nx08 範式
 * - 2 ⭐ EIP 改革：manual（業界 ERP 標配）+ search（Postgres FTS 業界中小罕見）
 */

import type { SideMenuGroup } from '@/features/layout/config/menu.nx00';

export function getNx09SideMenu(): SideMenuGroup[] {
  return [
    {
      group: 'EIP 企業資訊平台',
      items: [
        { key: 'eip.home',     label: 'EIP 首頁',                href: '/dashboard/nx09/workspace' },
        { key: 'eip.search',   label: '全文搜尋 ⭐',             href: '/dashboard/nx09/search' },
        { key: 'eip.km',       label: 'KM 知識庫',               href: '/dashboard/nx09/km' },
        { key: 'eip.document', label: '制度文件庫',              href: '/dashboard/nx09/document' },
        { key: 'eip.manual',   label: '系統操作手冊 ⭐',         href: '/dashboard/nx09/manual' },
        { key: 'eip.meeting',  label: '會議系統',                href: '/dashboard/nx09/meeting' },
      ],
    },
  ];
}

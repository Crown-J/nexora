/**
 * File: apps/nx-ui/src/features/layout/config/menu.nx09.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX09 EIP 企業資訊平台 + 亞羅汽配特色側邊選單
 *
 * Notes:
 * - TASK-NX09-IMPL-01 Phase 6：1 group / 6 items（EIP 基礎）
 * - TASK-NX09-IMPL-02 Phase 6 升：2 group / 10 items（+ 亞羅特色 group 4 items：VIN / RepairSop / ArticleTag / MeetingDetail）
 * - 對齊 menu.nx05~nx10 範式
 * - 4 ⭐ 業界改革標：manual（業界 ERP 標配）+ search（FTS 業界中小罕見）+ vin-lookup ⭐⭐⭐ + repair-sop ⭐⭐⭐
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
    {
      group: '亞羅汽配特色 + 子表（IMPL-02）',
      items: [
        { key: 'eip.vin-lookup',     label: 'VIN 對照 ⭐⭐⭐',          href: '/dashboard/nx09/vin-lookup' },
        { key: 'eip.repair-sop',     label: '維修 SOP ⭐⭐⭐',          href: '/dashboard/nx09/repair-sop' },
        { key: 'eip.article-tag',    label: 'KM 文章標籤',             href: '/dashboard/nx09/article-tag' },
        { key: 'eip.meeting-detail', label: '會議子表整合',            href: '/dashboard/nx09/meeting-detail' },
      ],
    },
  ];
}

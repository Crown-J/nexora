/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-020-F04
 * 首頁預設快捷鍵（單鍵 Q/W/E/R/T；依 LITE / PLUS+ 區分 T 鍵；Lucide 線框圖示）
 */

import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeftRight,
  ClipboardList,
  FileText,
  PackagePlus,
  Search,
  Tags,
} from 'lucide-react';
import type { PlanCode } from '@/mocks/dashboard';

export type DashboardQuickShortcutDef = {
  key: 'q' | 'w' | 'e' | 'r' | 't';
  label: string;
  href: string;
  Icon: LucideIcon;
};

const SHORTCUTS_QWER: DashboardQuickShortcutDef[] = [
  {
    key: 'q',
    label: '即時查詢',
    href: '/dashboard/inventory/workspace?mode=query',
    Icon: Search,
  },
  {
    key: 'w',
    label: '即時詢價',
    href: '/dashboard/purchase/domestic?mode=rfq',
    Icon: ClipboardList,
  },
  {
    key: 'e',
    label: '即時報價',
    href: '/dashboard/sales/domestic?mode=quote',
    Icon: Tags,
  },
  {
    key: 'r',
    label: '建立銷貨單',
    href: '/dashboard/sales/domestic?mode=so',
    Icon: FileText,
  },
];

const SHORTCUT_T_LITE: DashboardQuickShortcutDef = {
  key: 't',
  label: '建立進貨單',
  href: '/dashboard/purchase/domestic?mode=po',
  Icon: PackagePlus,
};

const SHORTCUT_T_PLUS_PRO: DashboardQuickShortcutDef = {
  key: 't',
  label: '調撥申請',
  href: '/dashboard/inventory/workspace?mode=transfer',
  Icon: ArrowLeftRight,
};

/**
 * LITE：T → 建立進貨單（採購 PO）
 * PLUS / PRO：T → 調撥申請
 */
export function getDashboardQuickShortcuts(planCode: PlanCode): DashboardQuickShortcutDef[] {
  const t = planCode === 'LITE' ? SHORTCUT_T_LITE : SHORTCUT_T_PLUS_PRO;
  return [...SHORTCUTS_QWER, t];
}

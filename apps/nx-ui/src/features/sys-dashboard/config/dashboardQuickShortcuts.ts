/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-020-F04
 * 首頁預設快捷鍵（單鍵 Q/W/E/R/T；依 LITE / PLUS+ 區分 T 鍵；Lucide 線框圖示）
 */

import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeftRight,
  ClipboardList,
  FileText,
  MoreHorizontal,
  PackagePlus,
  Search,
  Tags,
} from 'lucide-react';
import type { PlanCode } from '@/mocks/dashboard';

export type DashboardQuickShortcutDef = {
  key: 'q' | 'w' | 'e' | 'r' | 't' | 'y';
  label: string;
  href: string;
  Icon: LucideIcon;
};

const SHORTCUTS_QWER: DashboardQuickShortcutDef[] = [
  {
    key: 'q',
    label: '即時查詢',
    href: '/dashboard/nx03/workspace?mode=query',
    Icon: Search,
  },
  {
    key: 'w',
    label: '即時詢價',
    href: '/dashboard/nx02/domestic?mode=rfq',
    Icon: ClipboardList,
  },
  {
    key: 'e',
    label: '即時報價',
    href: '/dashboard/nx04/domestic?mode=quote',
    Icon: Tags,
  },
  {
    key: 'r',
    label: '建立銷貨單',
    href: '/dashboard/nx04/domestic?mode=so',
    Icon: FileText,
  },
];

const SHORTCUT_T_LITE: DashboardQuickShortcutDef = {
  key: 't',
  label: '建立進貨單',
  href: '/dashboard/nx02/domestic?mode=po',
  Icon: PackagePlus,
};

const SHORTCUT_T_PLUS_PRO: DashboardQuickShortcutDef = {
  key: 't',
  label: '調撥申請',
  href: '/dashboard/nx03/workspace?mode=transfer',
  Icon: ArrowLeftRight,
};

/**
 * 第 6 個快捷鍵（業界改革 #22 v1.2 + #17、Crown 拍板 6 slot 範式）。
 * placeholder：後續軌 TASK-DASHBOARD-QUICK-Y-IMPL 對齊業務戰略後 Crown 拍板實際功能。
 */
const SHORTCUT_Y_PLACEHOLDER: DashboardQuickShortcutDef = {
  key: 'y',
  label: '更多功能',
  href: '/dashboard/coming-soon',
  Icon: MoreHorizontal,
};

/**
 * LITE：T → 建立進貨單（採購 PO）；Y → 更多功能（placeholder）
 * PLUS / PRO：T → 調撥申請；Y → 更多功能（placeholder）
 */
export function getDashboardQuickShortcuts(planCode: PlanCode): DashboardQuickShortcutDef[] {
  const t = planCode === 'LITE' ? SHORTCUT_T_LITE : SHORTCUT_T_PLUS_PRO;
  return [...SHORTCUTS_QWER, t, SHORTCUT_Y_PLACEHOLDER];
}

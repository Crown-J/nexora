/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-020-F03
 * 首頁預設快捷鍵（單鍵 Q/W/E/R/T；依 LITE / PLUS+ 區分 T 鍵）
 */

import type { PlanCode } from '@/mocks/dashboard';

export type DashboardQuickShortcutDef = {
  key: 'q' | 'w' | 'e' | 'r' | 't';
  label: string;
  href: string;
  emoji: string;
};

const SHORTCUTS_QWER: DashboardQuickShortcutDef[] = [
  {
    key: 'q',
    label: '即時查詢',
    href: '/dashboard/inventory/workspace?mode=query',
    emoji: '🔍',
  },
  {
    key: 'w',
    label: '即時詢價',
    href: '/dashboard/purchase/domestic?mode=rfq',
    emoji: '📋',
  },
  {
    key: 'e',
    label: '即時報價',
    href: '/dashboard/sales/domestic?mode=quote',
    emoji: '💰',
  },
  {
    key: 'r',
    label: '建立銷貨單',
    href: '/dashboard/sales/domestic?mode=so',
    emoji: '📄',
  },
];

const SHORTCUT_T_LITE: DashboardQuickShortcutDef = {
  key: 't',
  label: '建立進貨單',
  href: '/dashboard/purchase/domestic?mode=po',
  emoji: '📥',
};

const SHORTCUT_T_PLUS_PRO: DashboardQuickShortcutDef = {
  key: 't',
  label: '調撥申請',
  href: '/dashboard/inventory/workspace?mode=transfer',
  emoji: '🔄',
};

/**
 * LITE：T → 建立進貨單（採購 PO）
 * PLUS / PRO：T → 調撥申請
 */
export function getDashboardQuickShortcuts(planCode: PlanCode): DashboardQuickShortcutDef[] {
  const t = planCode === 'LITE' ? SHORTCUT_T_LITE : SHORTCUT_T_PLUS_PRO;
  return [...SHORTCUTS_QWER, t];
}

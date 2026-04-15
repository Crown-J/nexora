/**
 * @FUNCTION_CODE NX99-SYS-DASH-UI-020-F01
 * 首頁預設快捷鍵（單鍵 Q/W/E/R/T + 左側按鈕列）
 */

import { ArrowLeftRight, ClipboardList, FileText, Search, Tag, type LucideIcon } from 'lucide-react';

export type DashboardQuickShortcutDef = {
  key: 'q' | 'w' | 'e' | 'r' | 't';
  label: string;
  href: string;
  Icon: LucideIcon;
};

export const DASHBOARD_QUICK_SHORTCUTS: DashboardQuickShortcutDef[] = [
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
    Icon: Tag,
  },
  {
    key: 'r',
    label: '建立銷貨單',
    href: '/dashboard/sales/domestic?mode=so',
    Icon: FileText,
  },
  {
    key: 't',
    label: '調撥申請',
    href: '/dashboard/inventory/workspace?mode=transfer',
    Icon: ArrowLeftRight,
  },
];

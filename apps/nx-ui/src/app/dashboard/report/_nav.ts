/**
 * 報表中心橫向導覽（對齊採購中心 `_nav` 模式）
 */

import { CalendarDays, CalendarRange, Download, LayoutDashboard, LayoutGrid } from 'lucide-react';
import type { ModuleNavItem } from '@/features/layout/ui/ModulePageNav';

export const REPORT_NAV_ITEMS: ModuleNavItem[] = [
  { key: 'hub', label: '報表首頁', href: '/dashboard/report', icon: LayoutGrid },
  { key: 'workspace', label: '報表工作台', href: '/dashboard/report/workspace', icon: LayoutDashboard },
  { key: 'daily', label: '工作日誌', href: '/dashboard/report/daily', icon: CalendarDays },
  { key: 'monthly', label: '月報', href: '/dashboard/report/monthly', icon: CalendarRange },
  { key: 'export', label: '匯出', href: '/dashboard/report/export', icon: Download },
];

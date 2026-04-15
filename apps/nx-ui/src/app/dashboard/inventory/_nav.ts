/**
 * 庫存中心橫向導覽（對齊採購中心 `_nav` 模式）
 */

import { BarChart2, LayoutGrid, ScrollText, Settings, Warehouse } from 'lucide-react';
import type { ModuleNavItem } from '@/features/layout/ui/ModulePageNav';

export const INVENTORY_NAV_ITEMS: ModuleNavItem[] = [
  { key: 'hub', label: '庫存首頁', href: '/dashboard/inventory', icon: LayoutGrid },
  { key: 'workspace', label: '作業工作台', href: '/dashboard/inventory/workspace', icon: Warehouse },
  { key: 'setting', label: '庫位與安全量', href: '/dashboard/inventory/setting', icon: Settings },
  { key: 'balance', label: '庫存一覽', href: '/dashboard/nx02/balance', icon: BarChart2 },
  { key: 'ledger', label: '庫存台帳', href: '/dashboard/nx02/ledger', icon: ScrollText },
];

/**
 * 財務中心橫向導覽（對齊採購中心 `_nav` 模式）
 */

import {
  Banknote,
  Briefcase,
  CreditCard,
  FileSpreadsheet,
  Landmark,
  LayoutGrid,
  Receipt,
} from 'lucide-react';
import type { ModuleNavItem } from '@/features/layout/ui/ModulePageNav';

export const FINANCE_NAV_ITEMS: ModuleNavItem[] = [
  { key: 'hub', label: '財務首頁', href: '/dashboard/finance', icon: LayoutGrid },
  { key: 'workspace', label: '財務工作台', href: '/dashboard/finance/workspace', icon: Briefcase },
  { key: 'ar', label: '應收總覽', href: '/dashboard/finance/receivable', icon: Receipt },
  { key: 'ap', label: '應付總覽', href: '/dashboard/finance/payable', icon: Landmark },
  { key: 'cash', label: '收付款', href: '/dashboard/finance/cash', icon: Banknote },
  { key: 'notes', label: '票據', href: '/dashboard/finance/notes', icon: CreditCard },
  { key: 'closing', label: '關帳', href: '/dashboard/finance/closing', icon: FileSpreadsheet },
];

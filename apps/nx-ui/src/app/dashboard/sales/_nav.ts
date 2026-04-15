/**
 * 銷貨中心橫向導覽（對齊採購中心 `_nav` 模式）
 */

import { Building2, LayoutDashboard, Package, Route, ShoppingCart } from 'lucide-react';
import type { ModuleNavItem } from '@/features/layout/ui/ModulePageNav';

export const SALES_NAV_ITEMS: ModuleNavItem[] = [
  { key: 'domestic', label: '國內銷售作業', href: '/dashboard/sales/domestic', icon: ShoppingCart },
  { key: 'bench', label: 'NX03 工作台', href: '/dashboard/nx03/workbench', icon: LayoutDashboard },
  { key: 'pipeline', label: '客戶銷貨流程', href: '/dashboard/nx03/customer-sales', icon: Route },
  { key: 'customers', label: '客戶主檔', href: '/dashboard/base/partners', icon: Building2 },
  { key: 'parts', label: '料號主檔', href: '/dashboard/base/parts', icon: Package },
];

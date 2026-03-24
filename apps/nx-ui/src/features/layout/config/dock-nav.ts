/**
 * File: apps/nx-ui/src/features/layout/config/dock-nav.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - ErpAppShell Dock / 手機底欄：路由與 active 判斷（單一來源）
 */

import type { FC } from 'react';
import {
  IconBox,
  IconCart,
  IconChart,
  IconHome,
  IconLayers,
  IconReceipt,
  IconWarehouse,
} from '@/features/layout/ui/dock-icons';

export type DockNavItem = {
  key: string;
  label: string;
  href: string;
  icon: FC;
};

export const DOCK_NAV_ITEMS: DockNavItem[] = [
  { key: 'home', label: '首頁', href: '/home', icon: IconHome },
  { key: 'base', label: '主檔', href: '/dashboard/base', icon: IconLayers },
  { key: 'procurement', label: '採購', href: '/dashboard', icon: IconBox },
  { key: 'inventory', label: '庫存', href: '/dashboard', icon: IconWarehouse },
  { key: 'sales', label: '銷售', href: '/dashboard', icon: IconCart },
  { key: 'finance', label: '財務', href: '/dashboard', icon: IconReceipt },
  { key: 'analytics', label: '分析', href: '/dashboard', icon: IconChart },
];

/**
 * @FUNCTION_CODE NX00-UI-SHELL-DOCK-001
 * 說明：/dashboard 與 /dashboard/base 分開判斷，避免同時高亮
 */
export function isDockItemActive(pathname: string, href: string): boolean {
  if (href === '/home') {
    return pathname === '/home' || pathname.startsWith('/home/');
  }
  if (href === '/dashboard/base') {
    return pathname === '/dashboard/base' || pathname.startsWith('/dashboard/base/');
  }
  if (href === '/dashboard') {
    return (
      pathname.startsWith('/dashboard') &&
      !pathname.startsWith('/dashboard/base') &&
      pathname !== '/dashboard/base'
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

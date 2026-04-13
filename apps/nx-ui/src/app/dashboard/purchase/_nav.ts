/**
 * File: apps/nx-ui/src/app/dashboard/purchase/_nav.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 採購管理模組頁面橫向導覽項目（供 ModulePageNav 使用）
 * - 底線前綴為 Next.js 私有檔案，不視為路由
 */

import { ShoppingCart, Globe, Zap, Package, Building2 } from 'lucide-react';
import type { ModuleNavItem } from '@/features/layout/ui/ModulePageNav';

export const PURCHASE_NAV_ITEMS: ModuleNavItem[] = [
  { key: 'domestic', label: '國內採購作業', href: '/dashboard/purchase/domestic', icon: ShoppingCart },
  { key: 'import',   label: '國外採購作業', href: '/dashboard/purchase/import',   icon: Globe,         plusOnly: true },
  { key: 'special',  label: '特殊採購',     href: '/dashboard/purchase/special',  icon: Zap },
  { key: 'product',  label: '產品管理',     href: '/dashboard/purchase/product',  icon: Package },
  { key: 'vendor',   label: '廠商管理',     href: '/dashboard/purchase/vendor',   icon: Building2 },
];

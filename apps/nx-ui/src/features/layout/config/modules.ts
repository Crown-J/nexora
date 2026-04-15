/**
 * File: apps/nx-ui/src/features/shell/config/modules.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHELL-001：主模組（Top Tabs）設定集中管理
 *
 * Notes:
 * - 路由 v2.0：語意化路由，不使用模組代碼（nx01 等）
 */

export type NxModuleCode =
  | 'base'
  | 'purchase'
  | 'inventory'
  | 'sales'
  | 'finance'
  | 'logistics'
  | 'hr'
  | 'report'
  | 'knowledge'
  | 'game';

export type ModuleTab = {
  code: NxModuleCode;
  label: string;
  href: string;
  enabled: boolean;
};

/**
 * @FUNCTION_CODE NX00-UI-SHELL-001-F01
 * 說明：
 * - 定義 TopBar 上方的主模組 Tabs
 * - 路由對應 ROUTE_TABLE_v2.0
 */
export function getModuleTabs(): ModuleTab[] {
  return [
    { code: 'base',      label: '主檔中心', href: '/dashboard/base',                 enabled: true },
    { code: 'purchase',  label: '採購管理', href: '/dashboard/purchase',              enabled: true },
    { code: 'inventory', label: '庫存管理', href: '/dashboard/inventory',             enabled: true },
    { code: 'sales',     label: '銷售管理', href: '/dashboard/sales',                 enabled: true },
    { code: 'finance',   label: '財務管理', href: '/dashboard/finance',               enabled: true },
  ];
}

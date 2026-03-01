/**
 * File: apps/nx-ui/src/features/shell/config/modules.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHELL-001：主模組（Top Tabs）設定集中管理
 *
 * Notes:
 * - 目前先用 NX00~NX04 代表（之後可換成中文：系統核心/採購/庫存/銷售/報表）
 */

export type NxModuleCode = 'nx00' | 'nx01' | 'nx02' | 'nx03' | 'nx04';

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
 * - 優點：未來要改名稱、路徑、開關，只改這裡
 */
export function getModuleTabs(): ModuleTab[] {
  return [
    { code: 'nx00', label: '基本資料', href: '/dashboard/nx00', enabled: true },
    { code: 'nx01', label: '進/退貨作業', href: '/dashboard/nx01', enabled: true },
    { code: 'nx03', label: '銷售/退作業', href: '/dashboard/nx03', enabled: true },
    { code: 'nx02', label: '庫存管理', href: '/dashboard/nx02', enabled: true },
    { code: 'nx04', label: '財務管理', href: '/dashboard/nx04', enabled: true },
  ];
}
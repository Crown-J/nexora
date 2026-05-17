/**
 * File: apps/nx-ui/src/features/layout/config/side-menu.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHELL-004：SideMenu 設定解析（依 pathname 回傳對應模組選單）
 *
 * Notes:
 * - 路由 v2.0：語意化路由，不使用模組代碼
 */

import { getNx00SideMenu, type SideMenuGroup } from '@/features/layout/config/menu.nx00';
import { getNx01SideMenu } from '@/features/layout/config/menu.nx01';
import { getNx02SideMenu } from '@/features/layout/config/menu.nx02';
import { getNx03SideMenu } from '@/features/layout/config/menu.nx03';
import { getNx04SideMenu } from '@/features/layout/config/menu.nx04';
import { getNx06SideMenu } from '@/features/layout/config/menu.nx06';
import { getNx07SideMenu } from '@/features/layout/config/menu.nx07';
import { getNx08SideMenu } from '@/features/layout/config/menu.nx08';

/**
 * @FUNCTION_CODE NX00-UI-SHELL-004-F01
 * 說明：
 * - 依 pathname 推斷當前模組（語意化路由 v2.0）
 * - 回傳該模組的 SideMenuGroup[]
 */
export function resolveSideMenuGroups(pathname: string): SideMenuGroup[] {
  // 主檔管理 & 採購工作台：頁面自帶導覽（卡片 Hub 或橫向導覽），不使用 SubNav
  if (pathname.startsWith('/dashboard/base')) return [];
  if (pathname.startsWith('/dashboard/purchase')) return [];
  if (pathname.startsWith('/dashboard/sale')) return [];
  if (pathname.startsWith('/dashboard/inventory')) return [];
  if (pathname.startsWith('/dashboard/finance')) return [];
  if (pathname.startsWith('/dashboard/report')) return [];
  if (
    pathname.startsWith('/dashboard/nx02/domestic') ||
    pathname.startsWith('/dashboard/nx02/import') ||
    pathname.startsWith('/dashboard/nx02/special') ||
    pathname.startsWith('/dashboard/nx02/product') ||
    pathname.startsWith('/dashboard/nx02/vendor')
  ) {
    return [];
  }
  if (pathname.startsWith('/dashboard/nx03')) return getNx02SideMenu();
  if (pathname.startsWith('/dashboard/nx04')) return getNx03SideMenu();
  if (pathname.startsWith('/dashboard/nx05')) return getNx04SideMenu();
  if (pathname.startsWith('/dashboard/nx06')) return getNx06SideMenu();
  if (pathname.startsWith('/dashboard/nx07')) return getNx07SideMenu();
  if (pathname.startsWith('/dashboard/nx08')) return getNx08SideMenu();
  return [];
}

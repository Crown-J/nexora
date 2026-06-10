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

import { type SideMenuGroup } from '@/features/layout/config/menu.base';
import { getNx06SideMenu } from '@/features/layout/config/menu.nx06';
import { getNx07SideMenu } from '@/features/layout/config/menu.nx07';
import { getNx09SideMenu } from '@/features/layout/config/menu.nx09';
import { getNx10SideMenu } from '@/features/layout/config/menu.nx10';

/**
 * @FUNCTION_CODE NX00-UI-SHELL-004-F01
 * 說明：
 * - 依 pathname 推斷當前模組（語意化路由 v2.0）、回傳該模組的 SideMenuGroup[]
 * - 線路重整段 5（2026-06-10）：舊 nx0X URL 全 server redirect 到業務名、
 *   usePathname 已取不到 /dashboard/nx0X、過渡判斷拆除。
 *   nx10 暫擱（橫向遊戲化機制、非獨立頁面）、唯一保留 nx 代碼判斷。
 */
export function resolveSideMenuGroups(pathname: string): SideMenuGroup[] {
  // 業務頁面自帶導覽（卡片 Hub 或橫向導覽）、不使用 SubNav
  if (pathname.startsWith('/dashboard/base')) return [];
  if (pathname.startsWith('/dashboard/purchase')) return [];
  if (pathname.startsWith('/dashboard/sale')) return [];
  if (pathname.startsWith('/dashboard/inventory')) return [];
  if (pathname.startsWith('/dashboard/finance')) return [];
  if (pathname.startsWith('/dashboard/report')) return [];
  if (pathname.startsWith('/dashboard/settings')) return [];
  if (pathname.startsWith('/dashboard/owner')) return [];

  // 仍用 SideMenu 的業務模組
  if (pathname.startsWith('/dashboard/delivery')) return getNx06SideMenu();
  if (pathname.startsWith('/dashboard/hr')) return getNx07SideMenu();
  if (pathname.startsWith('/dashboard/knowledge')) return getNx09SideMenu();
  if (pathname.startsWith('/dashboard/nx10')) return getNx10SideMenu();

  return [];
}

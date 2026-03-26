/**
 * File: apps/nx-ui/src/features/layout/config/side-menu.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHELL-004：SideMenu 設定解析（依 pathname 回傳對應模組選單）
 *
 * Notes:
 * - UI 不處理模組判斷規則，僅 render
 */

import { getNx00SideMenu, type SideMenuGroup } from '@/features/layout/config/menu.nx00';
import { getNx01SideMenu } from '@/features/layout/config/menu.nx01';
import { getNx02SideMenu } from '@/features/layout/config/menu.nx02';
import { getNx03SideMenu } from '@/features/layout/config/menu.nx03';
import { getNx04SideMenu } from '@/features/layout/config/menu.nx04';

/**
 * @FUNCTION_CODE NX00-UI-SHELL-004-F01
 * 說明：
 * - 依 pathname 推斷當前模組（nx00/nx01/...）
 * - 回傳該模組的 SideMenuGroup[]
 */
export function resolveSideMenuGroups(pathname: string): SideMenuGroup[] {
  const m = pathname.match(/^\/dashboard\/(nx\d{2})(?:\/|$)/i);
  const code = (m?.[1] || 'nx00').toLowerCase();

  switch (code) {
    case 'nx00':
      return getNx00SideMenu();
    case 'nx01':
      return getNx01SideMenu();
    case 'nx02':
      return getNx02SideMenu();
    case 'nx03':
      return getNx03SideMenu();
    case 'nx04':
      return getNx04SideMenu();

    default:
      return [];
  }
}
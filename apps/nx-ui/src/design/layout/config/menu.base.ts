/**
 * File: apps/nx-ui/src/features/shell/config/menu.base.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01 主檔管理（Base）側邊選單
 *
 * Notes:
 * - 路由 v2.0：所有路由統一掛在 /dashboard/master/* 之下
 * - 2026-06-27：改從單一來源 master-registry 衍生（surfaces 含 'side'）、六分區分組。
 */

import { masterEntriesByCategory } from '@/features/nx01/shell/master-nav/master-registry';

export type SideMenuItem = {
  key: string;
  label: string;
  href?: string;
  disabled?: boolean;
};

export type SideMenuGroup = {
  group: string;
  items: SideMenuItem[];
};

/**
 * @FUNCTION_CODE NX00-UI-SHELL-002-F01
 * 側選單從登錄表衍生：六分區分組、第一組前置「主檔總覽」入口。
 */
export function getNx00SideMenu(): SideMenuGroup[] {
  const groups: SideMenuGroup[] = masterEntriesByCategory('side').map((cat) => ({
    group: cat.label,
    items: cat.entries.map((e) => ({ key: `base.${e.id}`, label: e.label, href: e.href })),
  }));
  // 主檔總覽入口（前置於第一組）
  if (groups.length > 0) {
    groups[0].items.unshift({ key: 'base.home', label: '主檔總覽', href: '/dashboard/master' });
  }
  return groups;
}

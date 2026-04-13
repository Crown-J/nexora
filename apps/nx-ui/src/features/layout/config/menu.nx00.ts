/**
 * File: apps/nx-ui/src/features/shell/config/menu.nx00.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01 主檔管理（Base）側邊選單
 *
 * Notes:
 * - 路由 v2.0：所有路由統一掛在 /dashboard/base/* 之下
 */

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
 */
export function getNx00SideMenu(): SideMenuGroup[] {
  return [
    {
      group: '帳號與權限',
      items: [
        { key: 'base.home',           label: '主檔總覽',         href: '/dashboard/base' },
        { key: 'base.users',          label: '使用者',           href: '/dashboard/base/users' },
        { key: 'base.roles',          label: '職務主檔',         href: '/dashboard/base/roles' },
        { key: 'base.user-role',      label: '使用者職務設定',   href: '/dashboard/base/user-role' },
        { key: 'base.user-warehouse', label: '使用者據點設定',   href: '/dashboard/base/user-warehouse' },
        { key: 'base.role-view',      label: '職務權限設定',     href: '/dashboard/base/role-view' },
      ],
    },
    {
      group: '產品與料號',
      items: [
        { key: 'base.parts',           label: '零件主檔',   href: '/dashboard/base/parts' },
        { key: 'base.car-brand',       label: '汽車廠牌',   href: '/dashboard/base/car-brand' },
        { key: 'base.part-brand',      label: '零件廠牌',   href: '/dashboard/base/part-brand' },
      ],
    },
    {
      group: '倉儲',
      items: [
        { key: 'base.warehouses', label: '倉庫主檔', href: '/dashboard/base/warehouses' },
        { key: 'base.location',   label: '庫位主檔', href: '/dashboard/base/location' },
      ],
    },
    {
      group: '往來對象',
      items: [
        { key: 'base.partners', label: '廠商 / 客戶主檔', href: '/dashboard/base/partners' },
      ],
    },
  ];
}

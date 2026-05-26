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
        // 軌 A commit A1：user-role / user-warehouse 從 sub-nav 降階為「批次工具」、
        // 業務員 daily 改於 USER 詳細頁管理；PRO 用戶仍可從主檔中心 hub 卡片入。
        { key: 'base.role-view',      label: '職務權限設定',     href: '/dashboard/base/role-view' },
        { key: 'base.bulletins',      label: '公告主檔',         href: '/dashboard/base/bulletins' },
      ],
    },
    {
      group: '產品與料號',
      items: [
        { key: 'base.parts',           label: '零件主檔',   href: '/dashboard/base/parts' },
        { key: 'base.car-brand',       label: '汽車廠牌',   href: '/dashboard/base/car-brand' },
        { key: 'base.part-brand',      label: '零件廠牌',   href: '/dashboard/base/part-brand' },
        { key: 'base.part-group',      label: '零件族群',   href: '/dashboard/base/part-group' },
        { key: 'base.brand-code-rule', label: '品牌料號規則', href: '/dashboard/base/brand-code-rule' },
        { key: 'base.part-relation',   label: '零件關聯',   href: '/dashboard/base/part-relation' },
        { key: 'base.part-model',      label: '料件車型適配', href: '/dashboard/base/part-model' },
      ],
    },
    {
      group: '國家與幣別',
      items: [
        { key: 'base.country',  label: '國家主檔', href: '/dashboard/base/country' },
        { key: 'base.currency', label: '幣別主檔', href: '/dashboard/base/currency' },
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

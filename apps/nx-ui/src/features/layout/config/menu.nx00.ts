/**
 * File: apps/nx-ui/src/features/shell/config/menu.nx00.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHELL-002：NX00（系統核心）側邊選單設定
 *
 * Notes:
 * - 你圖上的左側次功能，先以 NX00 核心做出一套
 * - 之後 nx01/nx02… 會各自有一份 menu.nx01.ts / menu.nx02.ts
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
 * 說明：
 * - NX00 左側次功能分群（主檔 / 權限 / 產品 / 倉庫庫位 / 客供商 / 記錄）
 * - 之後可以直接把群組與項目對齊你 DB 的 function_group / function codes
 */
export function getNx00SideMenu(): SideMenuGroup[] {
  return [
    {
      group: '使用者與權限管理',
      items: [
        { key: 'nx00.users', label: '使用者基本資料', href: '/dashboard/nx00/users' },
        { key: 'nx00.roles', label: '職位基本資料', href: '/dashboard/nx00/roles' },
        { key: 'nx00.userroles', label: '使用者職位設定', href: '/dashboard/nx00/userroles', disabled: true },
        { key: 'nx00.permission', label: '權限基本資料', href: '/dashboard/nx00/permissions' },
        { key: 'nx00.rolepermission', label: '職位權限設定', href: '/dashboard/nx00/rolepermission', disabled: true },
      ],
    },
    {
      group: '產品管理',
      items: [
        { key: 'nx00.parts', label: '零件基本資料', href: '/dashboard/nx00/parts' },
        { key: 'nx00.brands', label: '廠牌基本資料', href: '/dashboard/nx00/brands', disabled: true },
        { key: 'nx00.functiongroups', label: '零件功能族群基本資料', href: '/dashboard/nx00/functiongroups', disabled: true },
        { key: 'nx00.partstatus', label: '零件狀態基本資料', href: '/dashboard/nx00/partstatus', disabled: true },
      ],
    },
    {
      group: '倉庫與庫位管理',
      items: [
        { key: 'nx00.warehouses', label: '倉庫基本資料', href: '/dashboard/nx00/warehouses', disabled: true },
        { key: 'nx00.locations', label: '庫位基本資料', href: '/dashboard/nx00/locations', disabled: true },
      ],
    },
    {
      group: '供應商與客戶管理',
      items: [
        { key: 'nx00.businessPartners', label: '往來客戶基本資料', href: '/dashboard/nx00/businessPartners', disabled: true },
      ],
    },
    {
      group: '系統紀錄管理',
      items: [{ key: 'nx00.audit', label: '操作紀錄追蹤', href: '/dashboard/nx00/audit', disabled: true }],
    },
  ];
}
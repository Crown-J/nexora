/**
 * File: apps/nx-ui/src/features/shell/config/menu.nx00.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHELL-002：NX00（系統核心）側邊選單設定
 *
 * Notes:
 * - NX00 左側次功能，先以 Lite 版所需的主檔/權限做出一套
 * - ✅ 路由統一採「單數 / 去 s 化」：/user /role /part ...
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
 * - NX00 左側次功能分群（使用者/權限、產品、倉庫庫位、夥伴、系統紀錄）
 * - 之後可以直接把群組與項目對齊你 DB 的 function_group / function codes
 */
export function getNx00SideMenu(): SideMenuGroup[] {
  return [
    {
      group: '使用者與權限管理',
      items: [
        { key: 'nx00.user', label: '使用者基本資料', href: '/dashboard/nx00/user' },
        { key: 'nx00.role', label: '權限角色基本資料', href: '/dashboard/nx00/role' },

        // group/matrix 類型頁（後端 controller 也是單數：user-role / role-view）
        { key: 'nx00.user-role', label: '使用者職位設定', href: '/dashboard/nx00/user-role' },
        { key: 'nx00.role-view', label: '使用者權限設定', href: '/dashboard/nx00/role-view' },
      ],
    },
    {
      group: '產品管理',
      items: [
        { key: 'nx00.part', label: '零件基本資料', href: '/dashboard/nx00/part' },
        { key: 'nx00.brand', label: '廠牌基本資料', href: '/dashboard/nx00/brand' },
      ],
    },
    {
      group: '倉庫與庫位管理',
      items: [
        // Lite：單倉設定頁（之後再做）
        { key: 'nx00.warehouse', label: '倉庫設定（Lite）', href: '/dashboard/nx00/warehouse' },
        { key: 'nx00.location', label: '庫位基本資料', href: '/dashboard/nx00/location' },
      ],
    },
    {
      group: '供應商與客戶管理',
      items: [{ key: 'nx00.partner', label: '往來客戶基本資料', href: '/dashboard/nx00/partner' }],
    },
  ];
}
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
 * - 原 NX00 主檔已遷至 `/base`（儀表板內 `/dashboard/nx00/*` 僅轉址）
 * - 此選單保留給仍落在 `/dashboard/nx00` 路徑之過渡情境；連結一律指向主檔新路徑
 */
export function getNx00SideMenu(): SideMenuGroup[] {
  return [
    {
      group: '使用者與權限管理',
      items: [
        { key: 'nx00.home', label: '主檔總覽', href: '/base' },
        { key: 'nx00.user', label: '使用者基本資料', href: '/base/user' },
        { key: 'nx00.role', label: '職務主檔', href: '/base/role' },
        { key: 'nx00.user-role', label: '使用者職務設定', href: '/base/user-role' },
        { key: 'nx00.role-view', label: '職務權限設定', href: '/base/role-view' },
      ],
    },
    {
      group: '產品管理',
      items: [
        { key: 'nx00.part', label: '零件基本資料', href: '/base/part' },
        { key: 'nx00.brand', label: '廠牌基本資料', href: '/base/brand' },
      ],
    },
    {
      group: '倉庫與庫位管理',
      items: [
        { key: 'nx00.warehouse', label: '倉庫／庫位主檔', href: '/base/location' },
        { key: 'nx00.location', label: '倉庫／庫位主檔', href: '/base/location' },
      ],
    },
    {
      group: '供應商與客戶管理',
      items: [{ key: 'nx00.partner', label: '往來客戶基本資料', href: '/base/partner' }],
    },
  ];
}
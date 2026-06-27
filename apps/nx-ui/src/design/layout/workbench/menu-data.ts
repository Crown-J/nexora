// apps/nx-ui/src/design/layout/workbench/menu-data.ts
// 傳統 ERP 頂部選單列資料：從 DOCK_NAV（導覽單一來源）衍生業務模組選單，
// 另補「系統」「視窗」兩個外殼層選單。新增功能只改 DOCK_NAV，此處自動跟著長。

import { DOCK_NAV, type DockItem } from '@data/home/home-data';

export type MenuAction = 'logout' | 'close-all';

export type MenuNode = {
  key: string;
  label: string;
  href?: string;
  action?: MenuAction;
  children?: MenuNode[];
};

function fromDock(item: DockItem): MenuNode {
  return {
    key: item.key,
    label: item.label,
    href: item.href,
    children: item.sub?.map(fromDock),
  };
}

// 業務模組選單：取 DOCK_NAV 內「主檔 / 採購 / 銷貨 / 庫存 / 財務 / 報表」
// （略過 首頁 / 個人 — 首頁用獨立按鈕、個人歸到「系統」選單）
const BUSINESS_KEYS = ['master', 'purchase', 'sales', 'inventory', 'finance', 'reports'];

export const BUSINESS_MENUS: MenuNode[] = DOCK_NAV.filter((d) => BUSINESS_KEYS.includes(d.key)).map(
  fromDock,
);

// 系統選單（外殼層、非業務模組）
export const SYSTEM_MENU: MenuNode = {
  key: 'system',
  label: '系統',
  children: [
    { key: 'me', label: '個人資料', href: '/dashboard/me' },
    { key: 'change-password', label: '修改密碼', href: '/dashboard/me/change-password' },
    { key: 'settings', label: '環境設定', href: '/dashboard/settings' },
    { key: 'logout', label: '登出', action: 'logout' },
  ],
};

// apps/nx-ui/src/features/home-dashboard/modules.config.ts
// 首頁 Win8 磚式：6 模組磚定義
//
// ⚠️ 規則：磚上「絕不顯示 NXxx 代碼」、只顯示業務中文名（客戶介面禁忌）
//   程式內 viewCodePrefix / id 照用、render 給客戶看的文字一律業務中文名
//
// 權限判斷：
//   me.view_permissions === null（SYSADMIN / OWNER）→ 全部模組磚亮
//   me.view_permissions[code]?.can_read === true 且 code 以該模組 prefix 開頭 → 亮
//   其餘 → 反灰 + 鎖頭、不可點

import {
  BarChart3,
  Boxes,
  Database,
  ShoppingBag,
  Truck,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export type ModuleTileDef = {
  /** 內部 id（樣式 key、不顯示給客戶）*/
  id: 'master' | 'purchase' | 'inventory' | 'sale' | 'finance' | 'report';
  /** 業務中文名（**唯一顯示給客戶看的文字**、絕不換成 NXxx）*/
  label: string;
  /** 點磚進的模組首頁 href */
  href: string;
  /** view_permissions code 的前綴（決定亮/反灰）*/
  viewCodePrefix: string;
  /** lucide 圖示 */
  Icon: LucideIcon;
  /** 是否顯示「待辦角標數字」（段②做、本段一律不顯）*/
  hasBadge: boolean;
};

export const MODULE_TILES: ModuleTileDef[] = [
  {
    id: 'master',
    label: '主檔',
    href: '/dashboard/base',
    viewCodePrefix: 'NX01_',
    Icon: Database,
    hasBadge: false,
  },
  {
    id: 'purchase',
    label: '進貨',
    href: '/dashboard/purchase',
    viewCodePrefix: 'NX02_',
    Icon: Truck,
    hasBadge: true,
  },
  {
    id: 'inventory',
    label: '庫存',
    href: '/dashboard/inventory',
    viewCodePrefix: 'NX03_',
    Icon: Boxes,
    hasBadge: true,
  },
  {
    id: 'sale',
    label: '銷貨',
    href: '/dashboard/sale',
    viewCodePrefix: 'NX04_',
    Icon: ShoppingBag,
    hasBadge: true,
  },
  {
    id: 'finance',
    label: '財務',
    href: '/dashboard/finance',
    viewCodePrefix: 'NX05_',
    Icon: Wallet,
    hasBadge: true,
  },
  {
    id: 'report',
    label: '報表',
    href: '/dashboard/report',
    viewCodePrefix: 'NX08_',
    Icon: BarChart3,
    hasBadge: false,
  },
];

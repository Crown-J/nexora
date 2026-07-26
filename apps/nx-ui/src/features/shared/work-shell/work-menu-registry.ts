// apps/nx-ui/src/features/shared/work-shell/work-menu-registry.ts
// 新殼左選單・入口註冊表 SSOT（執行長 2026-07-26 拍板：情境動作平鋪、量大再分類）
//
// 範式對齊 instant-workbench/station-registry.ts：加入口只改這裡一筆、殼（WorkShell）不用動。
// 入口兩種型態：
//   · route   → 導頁（href）
//   · station → 開即時工作檯的站（dispatch nx-instant-station-open、InstantWorkbench 接手）
// 分類欄位（group）先留位不啟用——執行長拍板：等入口變多再開始分類整理。

import type { LucideIcon } from 'lucide-react';
import { ArrowLeftRight, BadgeDollarSign, Home, ShoppingCart } from 'lucide-react';

import type { InstantStationNo } from '@/features/shared/instant-workbench/station-registry';

export type WorkMenuItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  action: { kind: 'route'; href: string } | { kind: 'station'; no: InstantStationNo };
  /** 留位：入口變多後的分類（現階段全部平鋪、不渲染分組） */
  group?: string;
};

export const WORK_MENU: WorkMenuItem[] = [
  { id: 'home', label: '首頁', icon: Home, action: { kind: 'route', href: '/work' } },
  // 情境入口（執行長拍板：平鋪、量大再分類）；station no 對齊 instant-workbench/station-registry
  { id: 'instant-quote', label: '即時報價', icon: BadgeDollarSign, action: { kind: 'station', no: 2 } },
  { id: 'transfer-inquiry', label: '調貨詢價', icon: ArrowLeftRight, action: { kind: 'station', no: 3 } },
  { id: 'instant-sales', label: '即時銷售', icon: ShoppingCart, action: { kind: 'station', no: 4 } },
];

/** station 入口共用：指名開站事件（InstantWorkbench 監聽、非 live 站忽略） */
export function openInstantStation(no: InstantStationNo) {
  window.dispatchEvent(new CustomEvent('nx-instant-station-open', { detail: { no } }));
}

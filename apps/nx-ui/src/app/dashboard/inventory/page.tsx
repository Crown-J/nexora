// apps/nx-ui/src/app/dashboard/inventory/page.tsx
/** 庫存路徑收斂 D 2026-06-08：移除庫存中心 Hub（手冊 §1.1「庫存中心」改 dock 進入）。
 *  進庫存一律走 dock（庫存一覽 / 庫存台帳 / 盤點單 / 調撥單 / 開帳單 / 倉位 等 LITE 子項）。
 *  /dashboard/inventory 自身只 redirect 到「庫存查詢」（最常用入口）。 */

import { redirect } from 'next/navigation';

export default function InventoryHubRedirect(): never {
  redirect('/dashboard/inventory/stock-query');
}

/**
 * File: apps/nx-ui/src/features/layout/config/menu.nx03.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX03 銷貨模組：`DashboardSubNav` 用選單（目前刻意為空）
 *
 * Notes:
 * - 首頁與客戶流程改由頁內導覽；勿在此重複頂部 pill。`/dashboard/nx03/customer-sales` 仍可直接書籤。
 */

import type { SideMenuGroup } from '@/features/layout/config/menu.nx00';

export function getNx03SideMenu(): SideMenuGroup[] {
  return [];
}

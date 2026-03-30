/**
 * File: apps/nx-ui/src/features/layout/config/menu.nx03.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX03 銷貨模組：`DashboardSubNav` 用選單（目前刻意為空）
 *
 * Notes:
 * - 模組首頁為流程總覽（`SalesFlowHub`）；即時工作台為 `/dashboard/nx03/workbench`。
 * - `/dashboard/nx03/customer-sales` 仍可直接書籤。
 */

import type { SideMenuGroup } from '@/features/layout/config/menu.nx00';

export function getNx03SideMenu(): SideMenuGroup[] {
  return [];
}

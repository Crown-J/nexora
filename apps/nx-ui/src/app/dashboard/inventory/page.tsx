/**
 * File: apps/nx-ui/src/app/dashboard/inventory/page.tsx
 *
 * Purpose:
 * - 庫存模組首頁（路由 v2：`/dashboard/inventory`）
 */

'use client';

import { Nx02DashboardPage } from '@/features/nx02/dashboard/ui/Nx02DashboardPage';

export default function InventoryModulePage() {
  return <Nx02DashboardPage surface="v2" />;
}

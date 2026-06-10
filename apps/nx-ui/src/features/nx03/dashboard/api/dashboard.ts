/**
 * File: apps/nx-ui/src/features/nx02/dashboard/api/dashboard.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-DSH-UI-API-001：庫存首頁統計
 */

import { apiFetch } from '@/shared/api/client';
import { assertOk } from '@/shared/api/http';

export type Nx02DashboardDto = {
  balance: { inStock: number; zero: number; negative: number };
  ledger: { thisMonthCount: number };
  init: { totalCount: number };
  stockSetting: { settingCount: number };
  stockTake: { inProgressCount: number };
  transfer: { inProgressCount: number };
  shortage: { openCount: number };
  autoReplenish: { activeRuleCount: number };
};

/**
 * @FUNCTION_CODE NX02-DSH-UI-API-001-F01
 */
export async function getNx02Dashboard(): Promise<Nx02DashboardDto> {
  const res = await apiFetch('/nx02/balance/dashboard', { method: 'GET' });
  await assertOk(res, 'nxui_nx02_dashboard_001');
  return (await res.json()) as Nx02DashboardDto;
}

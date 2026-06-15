/**
 * File: apps/nx-ui/src/features/nx01/api/dashboard.ts
 * Project: NEXORA (Monorepo)
 */

import { apiFetch } from '@data/api/client';
import { assertOk } from '@data/api/http';

import type { Nx01DashboardStats } from '@data/types/nx02';

export async function getNx01Dashboard(): Promise<Nx01DashboardStats> {
  const res = await apiFetch('/nx01/dashboard', { method: 'GET' });
  await assertOk(res, 'nxui_nx01_dashboard_001');
  return (await res.json()) as Nx01DashboardStats;
}

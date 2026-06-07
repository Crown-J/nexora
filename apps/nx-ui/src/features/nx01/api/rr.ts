/**
 * File: apps/nx-ui/src/features/nx01/api/rr.ts
 * Project: NEXORA (Monorepo)
 *
 * T0 路徑收斂 2026-06-07：path /nx01/rr → /nx02/rr（既有 nx01/rr 後端不存在）。
 * - postRr 改 PATCH /:id { status: 'POSTED' }（對齊 PR 範式、UpdateRrDto 已收 status）
 * - voidRr 改 DELETE /:id（後端 softDelete）
 */

import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';

import type { Nx01Paged, RrDetailDto, RrListRow } from '../types';

export type ListRrParams = {
  page: number;
  pageSize: number;
  q?: string;
  status?: string;
};

export async function listRr(params: ListRrParams): Promise<Nx01Paged<RrListRow>> {
  const q = buildQueryString({
    page: String(params.page),
    pageSize: String(params.pageSize),
    q: params.q?.trim() || undefined,
    status: params.status || undefined,
  });
  const res = await apiFetch(`/nx02/rr${q}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx01_rr_list_001');
  return (await res.json()) as Nx01Paged<RrListRow>;
}

export async function getRr(id: string): Promise<RrDetailDto> {
  const res = await apiFetch(`/nx02/rr/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx01_rr_get_001');
  return (await res.json()) as RrDetailDto;
}

export type CreateRrBody = {
  warehouseId: string;
  rrDate?: string;
  supplierId: string;
  rfqId?: string | null;
  poId?: string | null;
  remark?: string | null;
  taxRate?: number;
  items: {
    partId: string;
    locationId: string;
    qty: number;
    unitCost: number;
    poItemId?: string | null;
    rfqItemId?: string | null;
    remark?: string | null;
  }[];
};

export async function createRr(body: CreateRrBody): Promise<{ id: string }> {
  const res = await apiFetch('/nx02/rr', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx01_rr_create_001');
  return (await res.json()) as { id: string };
}

// T0：過帳走 PATCH /:id { status: 'POSTED' }（對齊 PR 範式）
export async function postRr(id: string): Promise<void> {
  const res = await apiFetch(`/nx02/rr/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'POSTED' }),
  });
  await assertOk(res, 'nxui_nx01_rr_post_001');
}

// T0：作廢走 DELETE /:id（後端 softDelete 改 status=CANCELLED）
export async function voidRr(id: string): Promise<void> {
  const res = await apiFetch(`/nx02/rr/${encodeURIComponent(id)}`, { method: 'DELETE' });
  await assertOk(res, 'nxui_nx01_rr_void_001');
}

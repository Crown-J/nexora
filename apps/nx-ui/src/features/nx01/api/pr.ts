/**
 * File: apps/nx-ui/src/features/nx01/api/pr.ts
 * Project: NEXORA (Monorepo)
 *
 * v1.2 階段 I P2 修補：path 從 /nx01/pr → /nx02/purchase-return（既有 PR UI 對接真實後端）
 * - 列表 response shape：backend { rows } → frontend { data }（mapper）
 * - postPr / voidPr 改走 PATCH /:id { status }（backend 無 /post /void endpoint）
 * - 加 patchPrDisposition：階段 I P2 走保固自動建保固單入口
 */

import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';

import type { Nx01Paged, PrDetailDto, PrListRow } from '../types';

export type ListPrParams = {
  page: number;
  pageSize: number;
  q?: string;
  status?: string;
};

interface BackendListResponse<T> {
  page: number;
  pageSize: number;
  total: number;
  rows: T[];
}

export async function listPr(params: ListPrParams): Promise<Nx01Paged<PrListRow>> {
  const q = buildQueryString({
    page: String(params.page),
    pageSize: String(params.pageSize),
    search: params.q?.trim() || undefined,
    status: params.status || undefined,
  });
  const res = await apiFetch(`/nx02/purchase-return${q}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_pr_list_001');
  const backend = (await res.json()) as BackendListResponse<PrListRow>;
  return {
    page: backend.page,
    pageSize: backend.pageSize,
    total: backend.total,
    data: backend.rows,
  };
}

export async function getPr(id: string): Promise<PrDetailDto> {
  const res = await apiFetch(`/nx02/purchase-return/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx02_pr_get_001');
  return (await res.json()) as PrDetailDto;
}

export type CreatePrBody = {
  rrId: string;
  supplierId: string;
  warehouseId: string;
  prDate?: string;
  remark?: string | null;
  taxRate?: number;
  dispositionFlag?: 'G' | 'B' | 'W';
  items: { rrItemId: string; qty: number; locationId?: string | null; remark?: string | null }[];
};

export async function createPr(body: CreatePrBody): Promise<{ id: string }> {
  const res = await apiFetch('/nx02/purchase-return', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx02_pr_create_001');
  return (await res.json()) as { id: string };
}

/** 過帳：PATCH /:id { status: 'POSTED' }（backend 不分 /post /void） */
export async function postPr(id: string): Promise<void> {
  const res = await apiFetch(`/nx02/purchase-return/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'POSTED' }),
  });
  await assertOk(res, 'nxui_nx02_pr_post_001');
}

export async function voidPr(id: string): Promise<void> {
  const res = await apiFetch(`/nx02/purchase-return/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'CANCELLED' }),
  });
  await assertOk(res, 'nxui_nx02_pr_void_001');
}

/**
 * 階段 I P2：patch dispositionFlag（G/B/W、DRAFT 階段可改）。
 * dispositionFlag='W' 並過帳時、後端會自動建 warranty claim。
 */
export async function patchPrDisposition(id: string, dispositionFlag: 'G' | 'B' | 'W'): Promise<void> {
  const res = await apiFetch(`/nx02/purchase-return/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ dispositionFlag }),
  });
  await assertOk(res, 'nxui_nx02_pr_disp_001');
}

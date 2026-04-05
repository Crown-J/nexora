/**
 * File: apps/nx-ui/src/features/nx01/api/rr.ts
 * Project: NEXORA (Monorepo)
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
  const res = await apiFetch(`/nx01/rr${q}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx01_rr_list_001');
  return (await res.json()) as Nx01Paged<RrListRow>;
}

export async function getRr(id: string): Promise<RrDetailDto> {
  const res = await apiFetch(`/nx01/rr/${encodeURIComponent(id)}`, { method: 'GET' });
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
    remark?: string | null;
  }[];
};

export async function createRr(body: CreateRrBody): Promise<{ id: string }> {
  const res = await apiFetch('/nx01/rr', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx01_rr_create_001');
  return (await res.json()) as { id: string };
}

export async function postRr(id: string): Promise<void> {
  const res = await apiFetch(`/nx01/rr/${encodeURIComponent(id)}/post`, { method: 'POST' });
  await assertOk(res, 'nxui_nx01_rr_post_001');
}

export async function voidRr(id: string): Promise<void> {
  const res = await apiFetch(`/nx01/rr/${encodeURIComponent(id)}/void`, { method: 'POST' });
  await assertOk(res, 'nxui_nx01_rr_void_001');
}

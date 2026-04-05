/**
 * File: apps/nx-ui/src/features/nx01/api/po.ts
 * Project: NEXORA (Monorepo)
 */

import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';

import type { Nx01Paged, PoDetailDto, PoListRow } from '../types';

export type ListPoParams = {
  page: number;
  pageSize: number;
  q?: string;
  status?: string;
};

export async function listPo(params: ListPoParams): Promise<Nx01Paged<PoListRow>> {
  const q = buildQueryString({
    page: String(params.page),
    pageSize: String(params.pageSize),
    q: params.q?.trim() || undefined,
    status: params.status || undefined,
  });
  const res = await apiFetch(`/nx01/po${q}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx01_po_list_001');
  return (await res.json()) as Nx01Paged<PoListRow>;
}

export async function getPo(id: string): Promise<PoDetailDto> {
  const res = await apiFetch(`/nx01/po/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx01_po_get_001');
  return (await res.json()) as PoDetailDto;
}

export type CreatePoBody = {
  warehouseId: string;
  poDate?: string;
  supplierId: string;
  rfqId?: string | null;
  expectedDate?: string | null;
  remark?: string | null;
  taxRate?: number;
  items: {
    partId: string;
    qty: number;
    unitCost: number;
    rfqItemId?: string | null;
    expectedDate?: string | null;
    remark?: string | null;
  }[];
};

export async function createPo(body: CreatePoBody): Promise<{ id: string }> {
  const res = await apiFetch('/nx01/po', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx01_po_create_001');
  return (await res.json()) as { id: string };
}

export type PoToRrBody = {
  warehouseId: string;
  items: { poItemId: string; qty: number; locationId?: string | null }[];
};

export async function poToRr(id: string, body: PoToRrBody): Promise<{ id: string }> {
  const res = await apiFetch(`/nx01/po/${encodeURIComponent(id)}/to-rr`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx01_po_to_rr_001');
  return (await res.json()) as { id: string };
}

export async function voidPo(id: string): Promise<void> {
  const res = await apiFetch(`/nx01/po/${encodeURIComponent(id)}/void`, { method: 'POST' });
  await assertOk(res, 'nxui_nx01_po_void_001');
}

export async function patchPoStatus(id: string, status: string): Promise<void> {
  const res = await apiFetch(`/nx01/po/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  await assertOk(res, 'nxui_nx01_po_status_001');
}

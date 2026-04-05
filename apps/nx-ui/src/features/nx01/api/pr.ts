/**
 * File: apps/nx-ui/src/features/nx01/api/pr.ts
 * Project: NEXORA (Monorepo)
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

export async function listPr(params: ListPrParams): Promise<Nx01Paged<PrListRow>> {
  const q = buildQueryString({
    page: String(params.page),
    pageSize: String(params.pageSize),
    q: params.q?.trim() || undefined,
    status: params.status || undefined,
  });
  const res = await apiFetch(`/nx01/pr${q}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx01_pr_list_001');
  return (await res.json()) as Nx01Paged<PrListRow>;
}

export async function getPr(id: string): Promise<PrDetailDto> {
  const res = await apiFetch(`/nx01/pr/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx01_pr_get_001');
  return (await res.json()) as PrDetailDto;
}

export type CreatePrBody = {
  rrId: string;
  supplierId: string;
  warehouseId: string;
  prDate?: string;
  remark?: string | null;
  taxRate?: number;
  items: { rrItemId: string; qty: number; locationId?: string | null; remark?: string | null }[];
};

export async function createPr(body: CreatePrBody): Promise<{ id: string }> {
  const res = await apiFetch('/nx01/pr', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx01_pr_create_001');
  return (await res.json()) as { id: string };
}

export async function postPr(id: string): Promise<void> {
  const res = await apiFetch(`/nx01/pr/${encodeURIComponent(id)}/post`, { method: 'POST' });
  await assertOk(res, 'nxui_nx01_pr_post_001');
}

export async function voidPr(id: string): Promise<void> {
  const res = await apiFetch(`/nx01/pr/${encodeURIComponent(id)}/void`, { method: 'POST' });
  await assertOk(res, 'nxui_nx01_pr_void_001');
}

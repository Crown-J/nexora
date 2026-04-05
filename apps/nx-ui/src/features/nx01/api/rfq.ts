/**
 * File: apps/nx-ui/src/features/nx01/api/rfq.ts
 * Project: NEXORA (Monorepo)
 */

import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';

import type { Nx01Paged, RfqDetailDto, RfqListRow } from '../types';

export type ListRfqParams = {
  page: number;
  pageSize: number;
  q?: string;
  status?: string;
};

export async function listRfq(params: ListRfqParams): Promise<Nx01Paged<RfqListRow>> {
  const q = buildQueryString({
    page: String(params.page),
    pageSize: String(params.pageSize),
    q: params.q?.trim() || undefined,
    status: params.status || undefined,
  });
  const res = await apiFetch(`/nx01/rfq${q}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx01_rfq_list_001');
  return (await res.json()) as Nx01Paged<RfqListRow>;
}

export async function getRfq(id: string): Promise<RfqDetailDto> {
  const res = await apiFetch(`/nx01/rfq/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx01_rfq_get_001');
  return (await res.json()) as RfqDetailDto;
}

export type CreateRfqBody = {
  warehouseId: string;
  rfqDate?: string;
  supplierId?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  remark?: string | null;
  items: { partId: string; qty: number; unitPrice?: number | null; leadTimeDays?: number | null; remark?: string | null }[];
};

export async function createRfq(body: CreateRfqBody): Promise<{ id: string }> {
  const res = await apiFetch('/nx01/rfq', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx01_rfq_create_001');
  return (await res.json()) as { id: string };
}

export type PatchRfqBody = {
  rfqDate?: string;
  supplierId?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  remark?: string | null;
  items?: {
    partId: string;
    qty: number;
    unitPrice?: number | null;
    leadTimeDays?: number | null;
    remark?: string | null;
  }[];
};

export async function patchRfq(id: string, body: PatchRfqBody): Promise<RfqDetailDto> {
  const res = await apiFetch(`/nx01/rfq/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx01_rfq_patch_001');
  return (await res.json()) as RfqDetailDto;
}

export type PatchRfqReplyBody = {
  items: { id: string; unit_price: number | null; lead_time_days: number | null; status: 'R' | 'C' }[];
};

export async function patchRfqReply(id: string, body: PatchRfqReplyBody): Promise<RfqDetailDto> {
  const res = await apiFetch(`/nx01/rfq/reply/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx01_rfq_reply_001');
  return (await res.json()) as RfqDetailDto;
}

export async function patchRfqStatus(id: string, status: string): Promise<void> {
  const res = await apiFetch(`/nx01/rfq/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  await assertOk(res, 'nxui_nx01_rfq_status_001');
}

export async function voidRfq(id: string): Promise<void> {
  const res = await apiFetch(`/nx01/rfq/${encodeURIComponent(id)}/void`, { method: 'POST' });
  await assertOk(res, 'nxui_nx01_rfq_void_001');
}

export type RfqToRrBody = {
  supplierId: string;
  warehouseId: string;
  items: { rfqItemId: string; qty: number }[];
};

export async function rfqToRr(id: string, body: RfqToRrBody): Promise<{ id: string }> {
  const res = await apiFetch(`/nx01/rfq/${encodeURIComponent(id)}/to-rr`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx01_rfq_to_rr_001');
  return (await res.json()) as { id: string };
}

export type RfqToPoBody = { items: { rfqItemId: string; qty: number }[] };

export async function rfqToPo(id: string, body: RfqToPoBody): Promise<{ id: string }> {
  const res = await apiFetch(`/nx01/rfq/${encodeURIComponent(id)}/to-po`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx01_rfq_to_po_001');
  return (await res.json()) as { id: string };
}

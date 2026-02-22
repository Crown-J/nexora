/**
 * File: apps/nx-ui/src/features/nx00/api/parts.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-003 / NX00-UI-004
 * - Parts API client (list/get/create/update/setActive)
 */

import { apiFetch } from '@/features/auth/apiFetch';
import type { PartRow } from '@/features/nx00/types';

function qs(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') sp.set(k, v);
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

async function readJsonOrText(res: Response) {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

async function mustOk(res: Response, code: string) {
  if (res.ok) return;

  const payload = await readJsonOrText(res).catch(() => '');
  const msg =
    typeof payload === 'string'
      ? payload
      : payload?.message
        ? Array.isArray(payload.message)
          ? payload.message.join(' / ')
          : String(payload.message)
        : JSON.stringify(payload);

  throw new Error(`[${code}] ${res.status} ${msg || 'Request failed'}`);
}

export type ListPartsParams = {
  keyword?: string;
  brandId?: string;
  functionGroupId?: string;
  statusId?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: 'partNo' | 'nameZh' | 'createdAt';
  sortDir?: 'asc' | 'desc';
};

export type ListPartsResult = {
  items: PartRow[];
  total: number;
};

export async function listParts(params: ListPartsParams): Promise<ListPartsResult> {
  const q = qs({
    keyword: params.keyword,
    brandId: params.brandId,
    functionGroupId: params.functionGroupId,
    statusId: params.statusId,
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
    page: params.page ? String(params.page) : undefined,
    pageSize: params.pageSize ? String(params.pageSize) : undefined,
    sortBy: params.sortBy,
    sortDir: params.sortDir,
  });

  const res = await apiFetch(`/nx00/parts${q}`, { method: 'GET' });
  await mustOk(res, 'nxui_nx00_parts_list_fetch_001');
  return (await res.json()) as ListPartsResult;
}

export async function getPart(id: string): Promise<PartRow> {
  const res = await apiFetch(`/nx00/parts/${id}`, { method: 'GET' });
  await mustOk(res, 'nxui_nx00_parts_get_fetch_001');
  return (await res.json()) as PartRow;
}

export type CreatePartBody = {
  partNo: string;
  oldPartNo?: string | null;
  displayNo?: string | null;
  nameZh: string;
  nameEn?: string | null;
  brandId: string;
  functionGroupId?: string | null;
  statusId: string;
  barcode?: string | null;
  isActive?: boolean;
  remark?: string | null;
};

export type UpdatePartBody = CreatePartBody;

export async function createPart(body: CreatePartBody): Promise<PartRow> {
  const res = await apiFetch('/nx00/parts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await mustOk(res, 'nxui_nx00_parts_create_fetch_001');
  return (await res.json()) as PartRow;
}

export async function updatePart(id: string, body: UpdatePartBody): Promise<PartRow> {
  const res = await apiFetch(`/nx00/parts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  await mustOk(res, 'nxui_nx00_parts_update_fetch_001');
  return (await res.json()) as PartRow;
}

export async function setPartActive(id: string, isActive: boolean) {
  const res = await apiFetch(`/nx00/parts/${id}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
  await mustOk(res, 'nxui_nx00_parts_set_active_fetch_001');
  return (await res.json().catch(() => ({}))) as any;
}

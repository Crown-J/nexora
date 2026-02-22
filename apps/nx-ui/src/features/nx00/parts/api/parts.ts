/**
 * File: apps/nx-ui/src/features/nx00/parts/api/parts.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-003 / NX00-UI-004：Parts API client（list/get/create/update/setActive）
 */

import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';

import type { PartRow } from '@/features/nx00/parts/types';

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

/**
 * @CODE nxui_nx00_parts_list_fetch_002
 * 說明：
 * - GET /nx00/parts
 * - 支援篩選、分頁、排序
 */
export async function listParts(params: ListPartsParams): Promise<ListPartsResult> {
  const q = buildQueryString({
    keyword: params.keyword,
    brandId: params.brandId,
    functionGroupId: params.functionGroupId,
    statusId: params.statusId,
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
    page: params.page === undefined ? undefined : String(params.page),
    pageSize: params.pageSize === undefined ? undefined : String(params.pageSize),
    sortBy: params.sortBy,
    sortDir: params.sortDir,
  });

  const res = await apiFetch(`/nx00/parts${q}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx00_parts_list_fetch_002');
  return (await res.json()) as ListPartsResult;
}

/**
 * @CODE nxui_nx00_parts_get_fetch_002
 * 說明：
 * - GET /nx00/parts/:id
 */
export async function getPart(id: string): Promise<PartRow> {
  const res = await apiFetch(`/nx00/parts/${id}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx00_parts_get_fetch_002');
  return (await res.json()) as PartRow;
}

/**
 * @CODE nxui_nx00_parts_create_fetch_002
 * 說明：
 * - POST /nx00/parts
 */
export async function createPart(body: CreatePartBody): Promise<PartRow> {
  const res = await apiFetch('/nx00/parts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx00_parts_create_fetch_002');
  return (await res.json()) as PartRow;
}

/**
 * @CODE nxui_nx00_parts_update_fetch_002
 * 說明：
 * - PUT /nx00/parts/:id
 */
export async function updatePart(id: string, body: UpdatePartBody): Promise<PartRow> {
  const res = await apiFetch(`/nx00/parts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_nx00_parts_update_fetch_002');
  return (await res.json()) as PartRow;
}

/**
 * @CODE nxui_nx00_parts_set_active_fetch_002
 * 說明：
 * - PATCH /nx00/parts/:id/active
 * - body: { isActive }
 *
 * Notes:
 * - 回傳格式不強依賴（後端可能回空物件或狀態）
 * - 避免後端回空 body 導致 json() 失敗
 */
export async function setPartActive(id: string, isActive: boolean): Promise<unknown> {
  const res = await apiFetch(`/nx00/parts/${id}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });

  await assertOk(res, 'nxui_nx00_parts_set_active_fetch_002');
  return res.json().catch(() => ({}));
}
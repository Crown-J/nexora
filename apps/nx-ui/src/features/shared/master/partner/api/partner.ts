/**
 * Partner API Client — 路徑與型別對齊 `features/base/api/partner`（nx01/partners）
 */

import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';
import { clampNx01ListPageSize } from '@/shared/lib/nx01Pagination';
import type { CreatePartnerBody, PagedResult, PartnerDto, UpdatePartnerBody } from '@/features/shared/master/partner/types';

const BASE = '/nx01/partners';

function normalizePagedPartner(raw: unknown): PagedResult<PartnerDto> {
  const j = raw as Record<string, unknown>;
  const items = (Array.isArray(j.items) ? j.items : Array.isArray(j.rows) ? j.rows : []) as PartnerDto[];
  return {
    items,
    page: Number(j.page ?? 1),
    pageSize: Number(j.pageSize ?? 20),
    total: Number(j.total ?? 0),
  };
}

export type ListPartnerParams = {
  page: number;
  pageSize: number;
  q?: string;
  /** v1.2 階段 E P2：模組頁過濾 partnerType（e.g. 銷貨頁只看 C/O、採購頁只看 S） */
  partnerType?: string;
  /** v1.2 階段 E P2：顯示停用過濾（undefined=全部、true=只啟用、false=只停用） */
  isActive?: boolean;
};

export async function listPartner(params: ListPartnerParams): Promise<PagedResult<PartnerDto>> {
  const pageSize = clampNx01ListPageSize(params.pageSize, 20);
  const query = buildQueryString({
    page: String(params.page),
    pageSize: String(pageSize),
    search: params.q?.trim() ? params.q.trim() : undefined,
    partnerType: params.partnerType,
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
  });

  const res = await apiFetch(`${BASE}${query}`, { method: 'GET' });
  await assertOk(res, 'nxui_master_partner_list_001');
  return normalizePagedPartner(await res.json());
}

export async function getPartner(id: string): Promise<PartnerDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_master_partner_get_001');
  return (await res.json()) as PartnerDto;
}

export async function createPartner(body: CreatePartnerBody): Promise<PartnerDto> {
  const res = await apiFetch(BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  await assertOk(res, 'nxui_master_partner_create_001');
  return (await res.json()) as PartnerDto;
}

export async function updatePartner(id: string, body: UpdatePartnerBody): Promise<PartnerDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

  await assertOk(res, 'nxui_master_partner_update_001');
  return (await res.json()) as PartnerDto;
}

export async function setPartnerActive(id: string, isActive: boolean): Promise<PartnerDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });

  await assertOk(res, 'nxui_master_partner_set_active_001');
  return (await res.json()) as PartnerDto;
}

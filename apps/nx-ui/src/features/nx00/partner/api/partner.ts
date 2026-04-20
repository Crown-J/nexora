/**
 * Partner API Client — 路徑與型別對齊 `features/base/api/partner`（nx01/partners）
 */

import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import type { CreatePartnerBody, PagedResult, PartnerDto, UpdatePartnerBody } from '@/features/nx00/partner/types';

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
};

export async function listPartner(params: ListPartnerParams): Promise<PagedResult<PartnerDto>> {
  const query = buildQueryString({
    page: String(params.page),
    pageSize: String(params.pageSize),
    search: params.q?.trim() ? params.q.trim() : undefined,
  });

  const res = await apiFetch(`${BASE}${query}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx00_partner_list_001');
  return normalizePagedPartner(await res.json());
}

export async function getPartner(id: string): Promise<PartnerDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_nx00_partner_get_001');
  return (await res.json()) as PartnerDto;
}

export async function createPartner(body: CreatePartnerBody): Promise<PartnerDto> {
  const res = await apiFetch(BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  await assertOk(res, 'nxui_nx00_partner_create_001');
  return (await res.json()) as PartnerDto;
}

export async function updatePartner(id: string, body: UpdatePartnerBody): Promise<PartnerDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

  await assertOk(res, 'nxui_nx00_partner_update_001');
  return (await res.json()) as PartnerDto;
}

export async function setPartnerActive(id: string, isActive: boolean): Promise<PartnerDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });

  await assertOk(res, 'nxui_nx00_partner_set_active_001');
  return (await res.json()) as PartnerDto;
}

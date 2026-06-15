/**
 * File: apps/nx-ui/src/features/shared/master/part/api/part.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - Part API Client（list/get/create/update/setActive）
 * - 路徑：`GET|POST|PATCH|DELETE /nx01/parts`（與 nx-api `PartController` 一致）
 */

import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';
import { clampNx01ListPageSize } from '@data/utils/nx01Pagination';
import type { CreatePartBody, PagedResult, PartDto, UpdatePartBody } from '@data/types/shared/master/part';

const BASE = '/nx01/parts';

function normalizePartListPayload(raw: unknown): PagedResult<PartDto> {
  const j = raw as Record<string, unknown>;
  const items = (Array.isArray(j.items) ? j.items : Array.isArray(j.rows) ? j.rows : []) as PartDto[];
  return {
    items,
    page: Number(j.page ?? 1),
    pageSize: Number(j.pageSize ?? 20),
    total: Number(j.total ?? 0),
  };
}

export type ListPartParams = {
  page: number;
  pageSize: number;
  /** 模糊搜尋（對應後端 `search`） */
  q?: string;
};

/**
 * @FUNCTION_CODE NX00-UI-NX00-PART-API-001-F01
 * - GET /nx01/parts?page=&pageSize=&search=
 */
export async function listPart(params: ListPartParams): Promise<PagedResult<PartDto>> {
  const pageSize = clampNx01ListPageSize(params.pageSize, 20);
  const query = buildQueryString({
    page: String(params.page),
    pageSize: String(pageSize),
    search: params.q?.trim() ? params.q.trim() : undefined,
  });

  const res = await apiFetch(`${BASE}${query}`, { method: 'GET' });
  await assertOk(res, 'nxui_master_part_list_001');
  return normalizePartListPayload(await res.json());
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-PART-API-001-F02
 * - GET /nx01/parts/:id
 */
export async function getPart(id: string): Promise<PartDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'GET' });
  await assertOk(res, 'nxui_master_part_get_001');
  return (await res.json()) as PartDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-PART-API-001-F03
 * - POST /nx01/parts
 */
export async function createPart(body: CreatePartBody): Promise<PartDto> {
  const res = await apiFetch(BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  await assertOk(res, 'nxui_master_part_create_001');
  return (await res.json()) as PartDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-PART-API-001-F04
 * - PATCH /nx01/parts/:id
 */
export async function updatePart(id: string, body: UpdatePartBody): Promise<PartDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

  await assertOk(res, 'nxui_master_part_update_001');
  return (await res.json()) as PartDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-PART-API-001-F05
 * - PATCH /nx01/parts/:id（僅 isActive）
 */
export async function setPartActive(id: string, isActive: boolean): Promise<PartDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });

  await assertOk(res, 'nxui_master_part_set_active_001');
  return (await res.json()) as PartDto;
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-PART-API-001-F06
 * M2-b：依成本重算建議售價（POST /nx01/parts/:id/recalc-prices）
 * 系統算為主（cost × customer_grade.marginPct）、可手動微調覆寫。
 */
export async function recalcPartPrices(id: string): Promise<PartDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/recalc-prices`, {
    method: 'POST',
    body: '{}',
  });
  await assertOk(res, 'nxui_master_part_recalc_prices_001');
  return (await res.json()) as PartDto;
}

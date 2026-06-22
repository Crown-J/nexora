// apps/nx-ui/src/data/endpoints/nx02/api/partner-part.ts
// 供應商供貨對應 API client（2026-06-22 新增、對接已存在的 nx02_partner_part）
// 後端 /nx02/partner-part 5 endpoints：list / getById / create / update / softDelete

import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';

export type PartnerPartDto = {
  id: string;
  tenantId: string;
  partnerId: string;
  partId: string;
  isPrimary: boolean;
  supplierPartNo: string | null;
  defaultUnitCost: string | null;
  defaultLeadDays: number | null;
  moq: string | null;
  source: 'S' | 'M';
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
  partner?: { code: string; name: string; partnerType: string } | null;
  part?: {
    code: string;
    name: string;
    brandId: string | null;
    brand: { code: string; name: string } | null;
  } | null;
};

export type PartnerPartListResult = {
  page: number;
  pageSize: number;
  total: number;
  items: PartnerPartDto[];
};

export async function listPartnerParts(params: {
  partnerId?: string;
  partId?: string;
  source?: 'S' | 'M';
  isPrimary?: boolean;
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<PartnerPartListResult> {
  const qs = buildQueryString({
    partnerId: params.partnerId,
    partId: params.partId,
    source: params.source,
    isPrimary: params.isPrimary === undefined ? undefined : String(params.isPrimary),
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
    search: params.search?.trim() || undefined,
    page: params.page != null ? String(params.page) : undefined,
    pageSize: params.pageSize != null ? String(params.pageSize) : undefined,
  });
  const res = await apiFetch(`/nx02/partner-part${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_partner_part_list');
  return (await res.json()) as PartnerPartListResult;
}

export async function createPartnerPart(body: {
  partnerId: string;
  partId: string;
  isPrimary?: boolean;
  supplierPartNo?: string;
  defaultUnitCost?: number;
  defaultLeadDays?: number;
  moq?: number;
  source?: 'S' | 'M';
  validFrom?: string;
  validTo?: string;
  remark?: string;
}): Promise<PartnerPartDto> {
  const res = await apiFetch('/nx02/partner-part', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_partner_part_create');
  return (await res.json()) as PartnerPartDto;
}

export async function updatePartnerPart(
  id: string,
  body: {
    isPrimary?: boolean;
    supplierPartNo?: string;
    defaultUnitCost?: number;
    defaultLeadDays?: number;
    moq?: number;
    source?: 'S' | 'M';
    validTo?: string;
    isActive?: boolean;
    remark?: string;
  },
): Promise<PartnerPartDto> {
  const res = await apiFetch(`/nx02/partner-part/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_partner_part_update');
  return (await res.json()) as PartnerPartDto;
}

export async function softDeletePartnerPart(id: string): Promise<{ ok: boolean }> {
  const res = await apiFetch(`/nx02/partner-part/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  await assertOk(res, 'nxui_partner_part_delete');
  return (await res.json()) as { ok: boolean };
}

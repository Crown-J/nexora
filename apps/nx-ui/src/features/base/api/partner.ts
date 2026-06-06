import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import { clampNx01ListPageSize } from '@/shared/lib/nx01Pagination';
import type { PagedResult } from './types';

// partner 改制六分類（Crown 2026-05-28）：C=保養廠 / O=同行 / S=供應商 / T=外包物流 / B=銀行 / V=一般廠商
export type PartnerType = 'C' | 'O' | 'S' | 'T' | 'V' | 'B';

export type PartnerDto = {
  id: string;
  code: string;
  name: string;
  partnerType: PartnerType;
  canTransferStock: boolean;
  contactName: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  remark: string | null;
  isActive: boolean;
  taxId: string | null;
  paymentTermDomestic: string;
  customerGradeId: string | null;
  customerGradeCode?: string | null;
  customerGradeName?: string | null;
  creditLimit: string | null;
  creditStatus: string;
  paymentTermImport: string | null;
  incoterm: string | null;
  // W3 [3-2] 舊代號（純對照）
  legacyCode?: string | null;
  createdAt: string;
  createdBy: string | null;
  createdByUsername: string | null;
  createdByName: string | null;
  updatedAt: string;
  updatedBy: string | null;
  updatedByUsername: string | null;
  updatedByName: string | null;
};

export type CreatePartnerBody = {
  // W3 [3-1]：code 改 optional（未填系統自動產 類型碼+4 碼）
  code?: string;
  name: string;
  partnerType?: PartnerType;
  canTransferStock?: boolean;
  contactName?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  address?: string | null;
  remark?: string | null;
  taxId?: string | null;
  paymentTermDomestic?: string;
  customerGradeId?: string | null;
  creditLimit?: number;
  creditStatus?: string;
  paymentTermImport?: string;
  incoterm?: string;
  isActive?: boolean;
  // W3 [3-2] 舊代號
  legacyCode?: string | null;
};

export type UpdatePartnerBody = {
  name?: string;
  partnerType?: PartnerType;
  canTransferStock?: boolean;
  contactName?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  address?: string | null;
  remark?: string | null;
  taxId?: string | null;
  paymentTermDomestic?: string;
  customerGradeId?: string | null;
  creditLimit?: number;
  creditStatus?: string;
  paymentTermImport?: string | null;
  incoterm?: string | null;
  isActive?: boolean;
  // W3 [3-2] 舊代號
  legacyCode?: string | null;
};

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

export async function listPartners(params: {
  q?: string;
  partnerType?: PartnerType;
  page?: number;
  pageSize?: number;
}): Promise<PagedResult<PartnerDto>> {
  const pageSize = clampNx01ListPageSize(params.pageSize, 20);
  const qs = buildQueryString({
    search: params.q?.trim() || undefined,
    partnerType: params.partnerType,
    page: params.page != null ? String(params.page) : undefined,
    pageSize: String(pageSize),
  });
  const res = await apiFetch(`${BASE}${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_partner_list');
  return normalizePagedPartner(await res.json());
}

export async function createPartner(body: CreatePartnerBody): Promise<PartnerDto> {
  const res = await apiFetch(BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_base_partner_create');
  return res.json() as Promise<PartnerDto>;
}

export async function updatePartner(id: string, body: UpdatePartnerBody): Promise<PartnerDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_base_partner_update');
  return res.json() as Promise<PartnerDto>;
}

export async function setPartnerActive(id: string, isActive: boolean): Promise<PartnerDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
  await assertOk(res, 'nxui_base_partner_set_active');
  return res.json() as Promise<PartnerDto>;
}

/** M2-c：依付款條件重算供應商等級（前端「重算」按鈕對應） */
export async function recalcPartnerSupplierGrade(id: string): Promise<PartnerDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}/recalc-supplier-grade`, {
    method: 'POST',
    body: '{}',
  });
  await assertOk(res, 'nxui_base_partner_recalc_supplier_grade');
  return res.json() as Promise<PartnerDto>;
}

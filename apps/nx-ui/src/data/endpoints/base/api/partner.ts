import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';
import { clampNx01ListPageSize } from '@data/utils/nx01Pagination';
import type { PagedResult } from '@data/types/base/api';

// partner 改制七分類：W4 [3-5] 2026-06-06 加 L=散客
export type PartnerType = 'C' | 'O' | 'S' | 'T' | 'V' | 'B' | 'L';

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
  // 02 對齊第二批 A 軌 CP2 2026-06-06：純文字 address DROP、結構化地址走 partner_address 衛星
  countryId?: string | null;
  // 02 真正完工軌 2026-06-07：partner.list 一行式地址（從 SHIPPING isDefault 組）、列表直接顯示
  shippingOneLine?: string | null;
  // 02 第三批 T2 2026-06-07：對方公司負責人
  ownerName?: string | null;
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
  // W4 [3-6] 預設發票聯式
  defaultInvoiceCopies?: number | null;
  // 02 對齊第二批 C 軌 CP1：地區 / 總公司 / 個別毛利率
  regionId?: string | null;
  parentPartnerId?: string | null;
  customMarginPct?: string | null;
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
  // 02 對齊第二批 A 軌 CP2 2026-06-06：純文字 address DROP、結構化走 partner_address 衛星
  countryId?: string | null;
  // 02 第三批 T2 2026-06-07
  ownerName?: string | null;
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
  // W4 [3-6] 預設發票聯式
  defaultInvoiceCopies?: number;
  // 02 對齊第二批 C 軌 CP1：地區 / 總公司 / 個別毛利率
  regionId?: string | null;
  parentPartnerId?: string | null;
  customMarginPct?: number | null;
};

export type UpdatePartnerBody = {
  name?: string;
  partnerType?: PartnerType;
  canTransferStock?: boolean;
  contactName?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  // 02 對齊第二批 A 軌 CP2 2026-06-06：純文字 address DROP、結構化走 partner_address 衛星
  countryId?: string | null;
  // 02 第三批 T2 2026-06-07
  ownerName?: string | null;
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
  // W4 [3-6] 預設發票聯式
  defaultInvoiceCopies?: number;
  // 02 對齊第二批 C 軌 CP1：地區 / 總公司 / 個別毛利率
  regionId?: string | null;
  parentPartnerId?: string | null;
  customMarginPct?: number | null;
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

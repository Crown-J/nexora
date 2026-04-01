import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import type { PagedResult } from './types';

export type PartnerDto = {
  id: string;
  code: string;
  name: string;
  partnerType: 'BOTH' | 'CUST' | 'SUP';
  contactName: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  remark: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy: string | null;
  createdByName: string | null;
  updatedAt: string;
  updatedBy: string | null;
  updatedByName: string | null;
};

export type PartnerType = PartnerDto['partnerType'];

export type CreatePartnerBody = {
  code: string;
  name: string;
  partnerType?: PartnerType;
  contactName?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  address?: string | null;
  remark?: string | null;
  isActive?: boolean;
};

export type UpdatePartnerBody = {
  code?: string;
  name?: string;
  partnerType?: PartnerType;
  contactName?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  address?: string | null;
  remark?: string | null;
  isActive?: boolean;
};

export async function listPartners(params: {
  q?: string;
  partnerType?: PartnerDto['partnerType'];
  page?: number;
  pageSize?: number;
}): Promise<PagedResult<PartnerDto>> {
  const qs = buildQueryString({
    q: params.q?.trim() || undefined,
    partnerType: params.partnerType,
    page: params.page != null ? String(params.page) : undefined,
    pageSize: params.pageSize != null ? String(params.pageSize) : undefined,
  });
  const res = await apiFetch(`/partner${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_partner_list');
  return res.json() as Promise<PagedResult<PartnerDto>>;
}

export async function createPartner(body: CreatePartnerBody): Promise<PartnerDto> {
  const res = await apiFetch('/partner', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_base_partner_create');
  return res.json() as Promise<PartnerDto>;
}

export async function updatePartner(id: string, body: UpdatePartnerBody): Promise<PartnerDto> {
  const res = await apiFetch(`/partner/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_base_partner_update');
  return res.json() as Promise<PartnerDto>;
}

export async function setPartnerActive(id: string, isActive: boolean): Promise<PartnerDto> {
  const res = await apiFetch(`/partner/${encodeURIComponent(id)}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
  await assertOk(res, 'nxui_base_partner_set_active');
  return res.json() as Promise<PartnerDto>;
}

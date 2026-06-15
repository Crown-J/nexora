// apps/nx-ui/src/features/nx01/vehicle-classification/api/transmission.ts
import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';

import type { Paged, TransmissionDto } from '@data/types/base/vehicle-classification';

const BASE = '/nx01/transmissions';

export type ListTransmissionParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  transmissionType?: number;
  carBrandId?: string;
  isActive?: boolean;
};

export type TransmissionBody = {
  code?: string;
  name?: string;
  nameEn?: string | null;
  transmissionType?: number;
  gearCount?: number | null;
  carBrandId?: string | null;
  remark?: string | null;
  sortNo?: number;
  isActive?: boolean;
};

export async function listTransmission(params: ListTransmissionParams): Promise<Paged<TransmissionDto>> {
  const q = buildQueryString({
    page: params.page !== undefined ? String(params.page) : undefined,
    pageSize: params.pageSize !== undefined ? String(params.pageSize) : undefined,
    search: params.search?.trim() ? params.search.trim() : undefined,
    transmissionType:
      params.transmissionType !== undefined ? String(params.transmissionType) : undefined,
    carBrandId: params.carBrandId?.trim() ? params.carBrandId.trim() : undefined,
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
  });
  const res = await apiFetch(`${BASE}${q}`, { method: 'GET' });
  await assertOk(res, 'nxui_transmission_list');
  return (await res.json()) as Paged<TransmissionDto>;
}

export async function createTransmission(body: TransmissionBody): Promise<TransmissionDto> {
  const res = await apiFetch(BASE, { method: 'POST', body: JSON.stringify(body) });
  await assertOk(res, 'nxui_transmission_create');
  return (await res.json()) as TransmissionDto;
}

export async function updateTransmission(id: string, body: TransmissionBody): Promise<TransmissionDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_transmission_update');
  return (await res.json()) as TransmissionDto;
}

export async function softDeleteTransmission(id: string): Promise<TransmissionDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  await assertOk(res, 'nxui_transmission_delete');
  return (await res.json()) as TransmissionDto;
}

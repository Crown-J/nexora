// apps/nx-ui/src/features/nx01/vehicle-classification/api/simple-catalog.ts
// drivetrain + model_type 共用 simple catalog API（6 業務欄位、無 carBrandId）
import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';

import type { Paged, SimpleCatalogDto } from '@data/types/nx01/vehicle-classification';

export type SimpleCatalogParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
};

export type SimpleCatalogBody = {
  code?: string;
  name?: string;
  nameEn?: string | null;
  remark?: string | null;
  sortNo?: number;
  isActive?: boolean;
};

/** variant = 'drivetrains' | 'model-types'（後端 route 對應） */
export type SimpleCatalogVariant = 'drivetrains' | 'model-types';

function baseUrl(variant: SimpleCatalogVariant): string {
  return `/nx01/${variant}`;
}

export async function listSimpleCatalog(
  variant: SimpleCatalogVariant,
  params: SimpleCatalogParams,
): Promise<Paged<SimpleCatalogDto>> {
  const q = buildQueryString({
    page: params.page !== undefined ? String(params.page) : undefined,
    pageSize: params.pageSize !== undefined ? String(params.pageSize) : undefined,
    search: params.search?.trim() ? params.search.trim() : undefined,
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
  });
  const res = await apiFetch(`${baseUrl(variant)}${q}`, { method: 'GET' });
  await assertOk(res, `nxui_${variant}_list`);
  return (await res.json()) as Paged<SimpleCatalogDto>;
}

export async function createSimpleCatalog(
  variant: SimpleCatalogVariant,
  body: SimpleCatalogBody,
): Promise<SimpleCatalogDto> {
  const res = await apiFetch(baseUrl(variant), { method: 'POST', body: JSON.stringify(body) });
  await assertOk(res, `nxui_${variant}_create`);
  return (await res.json()) as SimpleCatalogDto;
}

export async function updateSimpleCatalog(
  variant: SimpleCatalogVariant,
  id: string,
  body: SimpleCatalogBody,
): Promise<SimpleCatalogDto> {
  const res = await apiFetch(`${baseUrl(variant)}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, `nxui_${variant}_update`);
  return (await res.json()) as SimpleCatalogDto;
}

export async function softDeleteSimpleCatalog(
  variant: SimpleCatalogVariant,
  id: string,
): Promise<SimpleCatalogDto> {
  const res = await apiFetch(`${baseUrl(variant)}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  await assertOk(res, `nxui_${variant}_delete`);
  return (await res.json()) as SimpleCatalogDto;
}

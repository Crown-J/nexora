// apps/nx-ui/src/features/shared/address/address-catalog-api.ts
// 02 對齊第二批前端收尾軌 2026-06-07：地址型錄 API client（read-only）
import { apiFetch } from '@/shared/api/client';
import { assertOk } from '@/shared/api/http';
import { buildQueryString } from '@/shared/api/query';

export type CityRow = {
  id: string;
  code: string;
  name: string;
  nameEn: string | null;
  countryId: string;
  sortOrder: number;
  isActive: boolean;
};

export type DistrictRow = {
  id: string;
  cityId: string;
  code: string;
  name: string;
  nameEn: string | null;
  postalCode: string | null;
  sortOrder: number;
  isActive: boolean;
};

export async function listCities(params?: { countryId?: string }): Promise<CityRow[]> {
  const qs = buildQueryString({
    countryId: params?.countryId,
    isActive: 'true',
  });
  const res = await apiFetch(`/nx01/address-catalog/cities${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_address_cities');
  const j = (await res.json()) as { rows: CityRow[] };
  return j.rows ?? [];
}

export async function listDistricts(cityId: string): Promise<DistrictRow[]> {
  if (!cityId) return [];
  const qs = buildQueryString({ cityId, isActive: 'true' });
  const res = await apiFetch(`/nx01/address-catalog/districts${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_address_districts');
  const j = (await res.json()) as { rows: DistrictRow[] };
  return j.rows ?? [];
}

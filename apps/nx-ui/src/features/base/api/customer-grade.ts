import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import type { PagedResult } from './types';

export type CustomerGradeDto = {
  id: string;
  code: string;
  name: string;
  marginPct: string | null;
  sortNo: number;
  isActive: boolean;
};

function normalizePaged<T>(raw: unknown): PagedResult<T> {
  const j = raw as Record<string, unknown>;
  const items = (Array.isArray(j.items) ? j.items : Array.isArray(j.rows) ? j.rows : []) as T[];
  return {
    items,
    page: Number(j.page ?? 1),
    pageSize: Number(j.pageSize ?? 20),
    total: Number(j.total ?? 0),
  };
}

export async function listCustomerGrades(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}): Promise<PagedResult<CustomerGradeDto>> {
  const qs = buildQueryString({
    page: params?.page != null ? String(params.page) : undefined,
    pageSize: params?.pageSize != null ? String(params.pageSize) : undefined,
    search: params?.search?.trim() || undefined,
    isActive: params?.isActive === undefined ? undefined : String(params.isActive),
  });
  const res = await apiFetch(`/nx01/customer-grades${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_customer_grade_list');
  return normalizePaged<CustomerGradeDto>(await res.json());
}

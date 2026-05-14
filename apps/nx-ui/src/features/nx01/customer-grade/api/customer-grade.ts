// apps/nx-ui/src/features/nx01/customer-grade/api/customer-grade.ts
import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';

import type {
  CustomerGradeDto,
  ListCustomerGradeParams,
  PagedCustomerGrade,
  UpdateCustomerGradeBody,
} from '../types';

const BASE = '/nx01/customer-grades';

export async function listCustomerGrade(
  params: ListCustomerGradeParams,
): Promise<PagedCustomerGrade> {
  const q = buildQueryString({
    page: params.page !== undefined ? String(params.page) : undefined,
    pageSize: params.pageSize !== undefined ? String(params.pageSize) : undefined,
    search: params.search?.trim() ? params.search.trim() : undefined,
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
  });
  const res = await apiFetch(`${BASE}${q}`, { method: 'GET' });
  await assertOk(res, 'nxui_customer_grade_list');
  return (await res.json()) as PagedCustomerGrade;
}

export async function updateCustomerGrade(
  id: string,
  body: UpdateCustomerGradeBody,
): Promise<CustomerGradeDto> {
  const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, 'nxui_customer_grade_update');
  return (await res.json()) as CustomerGradeDto;
}

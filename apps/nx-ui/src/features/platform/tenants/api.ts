// apps/nx-ui/src/features/platform/tenants/api.ts
// 平台層 vs 租戶層分離軌 Phase 4：平台「客戶租戶」API client

import { platformFetch } from '../api/client';

export type TenantSummary = {
  id: string;
  code: string;
  name: string;
  nameEn: string | null;
  status: string;
  isActive: boolean;
  taxId: string | null;
  phone: string | null;
  planCode: string | null;
  contactName: string | null;
  contactEmail: string | null;
  createdAt: string;
  createdBy: string;
};

export type TenantDetail = TenantSummary & {
  address: string | null;
  logoUrl: string | null;
  contactPhone: string | null;
  dataStartDate: string | null;
  importWizardCompletedAt: string | null;
  creditOverdueDaysThreshold: number;
  remark: string | null;
  updatedAt: string;
  updatedBy: string;
  subscription: {
    id: string;
    planCode: string;
    planName: string;
    seats: number;
    startAt: string;
    endAt: string;
    status: string;
  } | null;
  stats: {
    userCount: number;
  };
};

export type ListTenantsResponse = {
  data: TenantSummary[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export function listTenants(params: { search?: string; page?: number; limit?: number } = {}): Promise<ListTenantsResponse> {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const suffix = qs.toString();
  return platformFetch<ListTenantsResponse>(`/platform/tenants${suffix ? '?' + suffix : ''}`);
}

export function getTenant(id: string): Promise<TenantDetail> {
  return platformFetch<TenantDetail>(`/platform/tenants/${id}`);
}

// apps/nx-ui/src/features/purchase/demand/api.ts
// v1.2 階段 I P3：採購需求 API client（手動新增 + list + ignore）

import { apiJson } from '@data/api/client';
import { buildQueryString } from '@data/api/query';

export type DemandType = 'S' | 'O';
export type DemandStatus = 'O' | 'P' | 'C' | 'I';

export interface Demand {
  id: string;
  docNo: string;
  demandType: DemandType;
  partId: string;
  warehouseId: string;
  qty: string;
  customerId?: string | null;
  expectedDate?: string | null;
  status: DemandStatus;
  ignoreReason?: string | null;
  refRfqId?: string | null;
  remark?: string | null;
  createdAt: string;
  part?: { code?: string | null; name?: string | null } | null;
  warehouse?: { code?: string | null; name?: string | null } | null;
  customer?: { code?: string | null; name?: string | null } | null;
}

export interface ListDemandParams {
  page?: number;
  pageSize?: number;
  demandType?: DemandType;
  status?: DemandStatus;
  warehouseId?: string;
  partId?: string;
  search?: string;
}

export function listDemand(params: ListDemandParams = {}): Promise<{
  page: number;
  pageSize: number;
  total: number;
  rows: Demand[];
}> {
  const qs = buildQueryString({
    page: params.page ? String(params.page) : undefined,
    pageSize: params.pageSize ? String(params.pageSize) : undefined,
    demandType: params.demandType,
    status: params.status,
    warehouseId: params.warehouseId,
    partId: params.partId,
    search: params.search,
  });
  return apiJson(`/nx02/demand${qs}`);
}

export interface CreateDemandPayload {
  demandType?: DemandType;
  partId: string;
  warehouseId: string;
  qty: number;
  customerId?: string;
  expectedDate?: string;
  remark?: string;
}

export function createDemand(payload: CreateDemandPayload): Promise<Demand> {
  return apiJson('/nx02/demand', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function ignoreDemand(id: string, ignoreReason: string): Promise<Demand> {
  return apiJson(`/nx02/demand/${encodeURIComponent(id)}/ignore`, {
    method: 'POST',
    body: JSON.stringify({ ignoreReason }),
  });
}

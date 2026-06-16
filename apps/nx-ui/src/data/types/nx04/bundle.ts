// apps/nx-ui/src/features/sale/bundle/types.ts
// F2 組合套餐 2026-06-09：型別

export interface BundleItem {
  id: string;
  bundleId: string;
  partId: string;
  partNo: string | null;
  partName: string | null;
  qty: string;
  createdAt: string;
  createdBy: string;
}

export interface Bundle {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  bundlePrice: string;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  remark: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  items?: BundleItem[];
}

export interface BundleListResponse {
  page: number;
  pageSize: number;
  total: number;
  rows: Bundle[];
}

export interface CreateBundleItemPayload {
  partId: string;
  qty: string;
}

export interface CreateBundlePayload {
  code: string;
  name: string;
  bundlePrice: string;
  validFrom: string;
  validTo: string;
  remark?: string;
  isActive?: boolean;
  items: CreateBundleItemPayload[];
}

export interface UpdateBundlePayload {
  name?: string;
  bundlePrice?: string;
  validFrom?: string;
  validTo?: string;
  remark?: string | null;
  isActive?: boolean;
}

export interface ApplyBundleToSoResult {
  bundleId: string;
  bundleCode: string;
  bundlePrice: string;
  addedLines: number;
}

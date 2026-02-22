/**
 * File: apps/nx-ui/src/features/nx00/types.ts
 * Project: NEXORA (Monorepo)
 * Purpose: NX00-UI-003 Shared types for NX00 master data (parts/lookups)
 * Notes:
 * - UI 使用 camelCase；API 回傳也假設 camelCase（與 users 一致）
 */

export type LookupRow = {
  id: string;
  code: string;
  name: string;
  nameEn?: string | null;
  isActive: boolean;
};

export type PartStatusRow = {
  id: string;
  code: string;
  name: string;
  canSell: boolean;
  canPurchase: boolean;
  isActive: boolean;
};

export type PartRow = {
  id: string;
  partNo: string;
  oldPartNo?: string | null;
  displayNo?: string | null;
  nameZh: string;
  nameEn?: string | null;

  brandId: string;
  functionGroupId?: string | null;
  statusId: string;

  barcode?: string | null;
  isActive: boolean;
  remark?: string | null;

  createdAt: string;
  createdBy?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
};

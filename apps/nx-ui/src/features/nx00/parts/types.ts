/**
 * File: apps/nx-ui/src/features/nx00/parts/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-004：Parts types
 */

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
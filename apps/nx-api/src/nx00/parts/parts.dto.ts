/**
 * File: apps/nx-api/src/nx00/parts/parts.dto.ts
 * Purpose: NX00-API-002 Parts DTOs (Create/Update/SetActive + List Query Types)
 * Notes:
 * - 風格對齊 users.dto.ts：使用 type 定義 body
 */

export type CreatePartBody = {
  partNo: string;
  oldPartNo?: string | null;
  displayNo?: string | null;
  nameZh: string;
  nameEn?: string | null;
  brandId: string;
  functionGroupId?: string | null;
  statusId: string;
  barcode?: string | null;
  isActive?: boolean;
  remark?: string | null;
};

export type UpdatePartBody = Partial<CreatePartBody>;

export type SetPartActiveBody = {
  isActive: boolean;
};

export type ListPartsArgs = {
  keyword?: string;
  brandId?: string;
  functionGroupId?: string;
  statusId?: string;
  isActive?: boolean;

  page: number;
  pageSize: number;

  sortBy?: 'partNo' | 'nameZh' | 'createdAt';
  sortDir?: 'asc' | 'desc';
};

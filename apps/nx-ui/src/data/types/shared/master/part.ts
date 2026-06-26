/**
 * File: apps/nx-ui/src/features/shared/master/part/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - Part Types（SSOT，對齊 nx-api `nx01/parts` 與 `nx01_part`）
 */

export type PartDto = {
  id: string;
  code: string;
  name: string;

  partBrandId: string | null;
  brandCode?: string | null;
  brandName?: string | null;

  isOem: boolean;

  /** A/B/C/D */
  partType: string | null;

  secCode: string;
  // 2026-06-26 分類一（採購角度）/ 分類二（技術角度）寫死 SmallInt、選填
  purchaseCategory: number | null;
  techCategory: number | null;

  countryId: string | null;
  countryCode?: string | null;
  countryName?: string | null;

  partGroupId: string | null;
  partGroupCode?: string | null;
  partGroupName?: string | null;

  spec: string | null;
  uom: string;
  isActive: boolean;

  returnPolicy: string;
  warrantyMonths: number;
  // 02 第四批 軌 6 2026-06-07：建議保存期限（可空、空=取族群預設）
  shelfLifeMonths: number | null;
  /** API 以字串表示 Decimal */
  priceA: string | null;
  priceB: string | null;
  priceC: string | null;
  priceD: string | null;
  priceUpdatedAt: string | null;
  priceUpdatedBy: string | null;
  // 02 第四批 軌 3b 2026-06-07：最後進貨/銷售時間（service 自動寫、業務員業績指標）
  lastPurchaseAt: string | null;
  lastSaleAt: string | null;

  // v1.2 階段 E P3 補（DTO 已支援、types 對齊）
  cost: string | null;

  // v1.2 階段 E P5：part 衛星表 oemCodes（service.getById 回傳整批；其他衛星走獨立 endpoint）
  oemCodes?: PartOemCodeItem[];

  createdAt: string;
  createdBy: string | null;
  createdByUsername?: string | null;
  createdByName?: string | null;

  updatedAt: string;
  updatedBy: string | null;
  updatedByUsername?: string | null;
  updatedByName?: string | null;
};

export type PartOemCodeItem = {
  id?: string;
  partBrandId: string | null;
  partBrandName?: string | null;
  oemCode: string;
  remark?: string | null;
};

export type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type PartsListQuery = {
  q?: string;
  page?: number;
  pageSize?: number;
};

// 共用 part 寫入欄位（2026-06-26：移除 seg/oldCode、加分類一二）
export type PartWritableFields = {
  partBrandId?: string | null;
  isOem?: boolean;
  partType?: string | null;
  secCode?: string;
  purchaseCategory?: number | null;
  techCategory?: number | null;
  countryId?: string | null;
  partGroupId?: string | null;
  spec?: string | null;
  uom?: string;
  isActive?: boolean;
  returnPolicy?: string;
  warrantyMonths?: number;
  priceA?: number;
  priceB?: number;
  priceC?: number;
  priceD?: number;
  cost?: number;
  // v1.2 階段 E P6 A2：正廠對應料號子表（整批取代）
  oemCodes?: PartOemCodeItem[];
};

export type CreatePartBody = PartWritableFields & {
  code: string;
  secCode: string;
  name: string;
};

export type UpdatePartBody = PartWritableFields & {
  code?: string;
  name?: string;
};

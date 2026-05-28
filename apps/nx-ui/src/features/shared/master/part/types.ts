/**
 * File: apps/nx-ui/src/features/shared/master/part/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - Part Types（SSOT，對齊 nx-api `nx01/parts` 與 `nx01_part`）
 */

export type PartDto = {
  id: string;
  codeRuleId: string;
  codeRuleName?: string | null;
  code: string;
  name: string;

  partBrandId: string | null;
  brandCode?: string | null;
  brandName?: string | null;

  isOem: boolean;

  /** A/B/C/D */
  partType: string | null;

  secCode: string | null;
  seg1: string | null;
  seg2: string | null;
  seg3: string | null;
  seg4: string | null;
  seg5: string | null;

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
  /** API 以字串表示 Decimal */
  priceA: string | null;
  priceB: string | null;
  priceC: string | null;
  priceD: string | null;
  priceUpdatedAt: string | null;
  priceUpdatedBy: string | null;

  createdAt: string;
  createdBy: string | null;
  createdByUsername?: string | null;
  createdByName?: string | null;

  updatedAt: string;
  updatedBy: string | null;
  updatedByUsername?: string | null;
  updatedByName?: string | null;
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

export type CreatePartBody = {
  codeRuleId: string;
  code: string;
  name: string;
  partBrandId?: string | null;
  isOem?: boolean;
  partType?: string | null;
  secCode?: string | null;
  seg1?: string | null;
  seg2?: string | null;
  seg3?: string | null;
  seg4?: string | null;
  seg5?: string | null;
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
};

export type UpdatePartBody = {
  codeRuleId?: string;
  code?: string;
  name?: string;
  partBrandId?: string | null;
  isOem?: boolean;
  partType?: string | null;
  secCode?: string | null;
  seg1?: string | null;
  seg2?: string | null;
  seg3?: string | null;
  seg4?: string | null;
  seg5?: string | null;
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
};

/**
 * File: apps/nx-ui/src/features/nx00/lookups/types.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-003：Lookups types（brand/function-group/part-status）
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
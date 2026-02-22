/**
 * File: apps/nx-ui/src/shared/types/pagination.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-TYPES-001：通用分頁型別
 */

export type PaginatedResult<T> = {
  items: T[];
  total: number;
};
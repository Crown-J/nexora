// apps/nx-ui/src/features/nx01/model/types.ts
// 對應規格：docs/nx01/spec/intent/nx01-13-model.md v1.0 §4
export type ModelDto = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  carBrandId: string;
  carBrandCode: string | null;
  carBrandName: string | null;
  modelYearFrom: number | null;
  modelYearTo: number | null;
  // 2026-06-26：取消引擎/變速箱/傳動/車體類型外鍵、改自由輸入
  engineCode: string | null;
  displacementCc: number | null;
  remark: string | null;
  sortNo: number;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

export type PagedModel = {
  page: number;
  pageSize: number;
  total: number;
  rows: ModelDto[];
};

export type ListModelParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  carBrandId?: string;
  modelYearFrom?: number;
  isActive?: boolean;
};

export type ModelBody = {
  code?: string;
  name?: string;
  carBrandId?: string;
  modelYearFrom?: number | null;
  modelYearTo?: number | null;
  engineCode?: string | null;
  displacementCc?: number | null;
  remark?: string | null;
  sortNo?: number;
  isActive?: boolean;
};

export function formatYearRange(from: number | null, to: number | null): string {
  if (from === null) return to === null ? '—' : `~${to}`;
  if (to === null) return `${from}~`;
  if (to === from) return `${from}`;
  return `${from}~${to}`;
}

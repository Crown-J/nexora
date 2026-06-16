// apps/nx-ui/src/features/nx01/engine/types.ts
// 對應規格：docs/nx01/spec/intent/nx01-14-engine.md v1.0 §4
export type EngineDto = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  displacementCc: number | null;
  cylinderConfig: string | null;
  /** 1=汽油 / 2=柴油 / 3=Hybrid / 4=EV */
  fuelType: number;
  /** 1=NA / 2=TC / 3=SC / 4=TC+SC、nullable */
  aspirationType: number | null;
  carBrandId: string | null;
  carBrandCode: string | null;
  carBrandName: string | null;
  remark: string | null;
  sortNo: number;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

export type PagedEngine = {
  page: number;
  pageSize: number;
  total: number;
  rows: EngineDto[];
};

export type ListEngineParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  fuelType?: number;
  aspirationType?: number;
  carBrandId?: string;
  isActive?: boolean;
};

export type CreateEngineBody = {
  code: string;
  name: string;
  displacementCc?: number | null;
  cylinderConfig?: string | null;
  fuelType: number;
  aspirationType?: number | null;
  carBrandId?: string | null;
  remark?: string | null;
  sortNo?: number;
  isActive?: boolean;
};

export type UpdateEngineBody = Partial<CreateEngineBody>;

export const FUEL_TYPE_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 1, label: '汽油' },
  { value: 2, label: '柴油' },
  { value: 3, label: 'Hybrid' },
  { value: 4, label: 'EV' },
];

export const ASPIRATION_TYPE_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 1, label: 'NA 自然進氣' },
  { value: 2, label: 'TC 渦輪' },
  { value: 3, label: 'SC 機械' },
  { value: 4, label: 'TC+SC 雙增壓' },
];

export function fuelTypeLabel(v: number | null | undefined): string {
  return FUEL_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? '—';
}

export function aspirationTypeLabel(v: number | null | undefined): string {
  if (v == null) return '—';
  return ASPIRATION_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? '—';
}

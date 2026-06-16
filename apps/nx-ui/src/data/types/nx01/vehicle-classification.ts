// apps/nx-ui/src/features/nx01/vehicle-classification/types.ts
// 對應規格：docs/nx01/spec/intent/nx01-15-vehicle-classification.md v1.0 §4
// NX01-15 三表型別集中（transmission / drivetrain / model_type）

// ─── Transmission ───
export type TransmissionDto = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  nameEn: string | null;
  /** 1=手排 / 2=自排 / 3=雙離合 / 4=CVT / 5=AMT / 6=其他 */
  transmissionType: number;
  gearCount: number | null;
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

export const TRANSMISSION_TYPE_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 1, label: '手排' },
  { value: 2, label: '自排' },
  { value: 3, label: '雙離合' },
  { value: 4, label: 'CVT' },
  { value: 5, label: 'AMT' },
  { value: 6, label: '其他' },
];

export function transmissionTypeLabel(v: number | null | undefined): string {
  return TRANSMISSION_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? '—';
}

// ─── Drivetrain / ModelType（共用 simple catalog shape）───
export type SimpleCatalogDto = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  nameEn: string | null;
  remark: string | null;
  sortNo: number;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

export type DrivetrainDto = SimpleCatalogDto;
export type ModelTypeDto = SimpleCatalogDto;

// ─── Paged ───
export type Paged<T> = {
  page: number;
  pageSize: number;
  total: number;
  rows: T[];
};

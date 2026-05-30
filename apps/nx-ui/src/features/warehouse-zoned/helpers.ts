// apps/nx-ui/src/features/warehouse-zoned/helpers.ts
// v1.2 對齊軌 階段 E P4：warehouse 共用 helper
//
// 對齊 intent v1.1 §2.2：
// - 3 zone：basic / inventory（locations 衛星、P5）/ delivery（地址視角別名）
// - delivery zone 沒自己 field、用 DELIVERY_VIEW_FIELD_KEYS 從 basic 抽司機視角欄位

import {
  WAREHOUSE_FIELDS,
  type WarehouseZone,
} from '@/features/master-zones';

export type WarehouseDraft = Record<string, string | boolean>;

export type WarehouseRow = {
  id: string;
  code: string;
  name: string;
  siteId?: string | null;
  siteCode?: string | null;
  siteName?: string | null;
  isMain?: boolean;
  warehouseTypeId?: string | null;
  warehouseTypeCode?: string | null;
  warehouseTypeName?: string | null;
  managerUserId?: string | null;
  managerUserAccount?: string | null;
  managerUserName?: string | null;
  remark?: string | null;
  sortNo?: number;
  isActive: boolean;
  cityId?: string | null;
  districtId?: string | null;
  streetId?: string | null;
  lane?: number | null;
  alley?: number | null;
  buildingNo?: number | null;
  buildingSubNo?: number | null;
  floor?: string | null;
  roomNo?: string | null;
  createdAt?: string;
  createdByUsername?: string | null;
  createdByName?: string | null;
  updatedAt?: string;
  updatedByUsername?: string | null;
  updatedByName?: string | null;
};

/** schema 純數字欄位（lane/alley/buildingNo/buildingSubNo）字串↔number 邊界處理 */
const NUMERIC_KEYS = new Set(['lane', 'alley', 'buildingNo', 'buildingSubNo']);

/** 後端 row → 編輯 draft */
export function warehouseRowToDraft(row: WarehouseRow): WarehouseDraft {
  const draft: WarehouseDraft = {};
  for (const f of WAREHOUSE_FIELDS) {
    if (f.isSatellite) continue;
    const v = (row as unknown as Record<string, unknown>)[f.key];
    if (f.key === 'isMain') draft[f.key] = Boolean(v);
    else if (NUMERIC_KEYS.has(f.key)) {
      draft[f.key] = v == null ? '' : String(v);
    } else draft[f.key] = v == null ? '' : String(v);
  }
  return draft;
}

/** 空 draft（新增用） */
export function emptyWarehouseDraft(): WarehouseDraft {
  const draft: WarehouseDraft = {};
  for (const f of WAREHOUSE_FIELDS) {
    if (f.isSatellite) continue;
    if (f.key === 'isMain') draft[f.key] = false;
    else draft[f.key] = '';
  }
  return draft;
}

/**
 * draft → PATCH body
 * - editableZones=undefined（主檔中心）→ 送全欄
 * - editableZones=Set → 只送該 zones 欄位
 * - 編輯模式 code 鎖死
 * - 純數字欄位字串轉 number
 */
export function warehouseDraftToBody(
  draft: WarehouseDraft,
  editableZones: Set<WarehouseZone> | undefined,
  options: { isCreate: boolean },
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const f of WAREHOUSE_FIELDS) {
    if (f.isSatellite) continue;
    if (!options.isCreate && f.key === 'code') continue;
    if (editableZones && !editableZones.has(f.zone)) continue;
    const v = draft[f.key];
    if (f.key === 'isMain') {
      body[f.key] = Boolean(v);
      continue;
    }
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (trimmed === '' && !f.required) continue;
      if (NUMERIC_KEYS.has(f.key)) {
        const n = Number(trimmed);
        if (Number.isFinite(n)) body[f.key] = n;
        continue;
      }
      body[f.key] = trimmed;
      continue;
    }
    body[f.key] = v;
  }
  return body;
}

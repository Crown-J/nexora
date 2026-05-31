// apps/nx-ui/src/features/part-zoned/helpers.ts
// v1.2 對齊軌 階段 E P3：part 共用 helper
//
// row ↔ draft 轉換、editableZones 過濾 PATCH body。
// 對齊決策 3.2（v1.1）：成本保密靠模組權限 + 主檔權限兩道屏障、
// 本層只做「模組頁面 PATCH 只送本頁可編欄位」（屏障 1 的字面落實）。

import {
  PART_FIELDS,
  type PartZone,
} from '@/features/master-zones';
import type { PartDto, UpdatePartBody } from '@/features/shared/master/part/types';

export type PartDraft = Record<string, string | boolean>;

export const RETURN_POLICY_OPTIONS = [
  { value: 'F', label: 'F 可全退' },
  { value: 'S', label: 'S 限定條件退' },
  { value: 'R', label: 'R 限期退' },
  { value: 'N', label: 'N 不可退' },
  { value: 'W', label: 'W 保固期內可退' },
];

export const PART_TYPE_OPTIONS = [
  { value: '1', label: '1 專用件' },
  { value: '2', label: '2 通用件' },
  { value: '3', label: '3 組合件' },
  { value: '4', label: '4 拆解件' },
];

/** 字串/數字 Decimal 統一轉純字串、空值轉空 */
function decimalToText(v: unknown): string {
  if (v == null || v === '') return '';
  return String(v);
}

/** 後端 row 欄位名 → part-zones.ts 用的 zone key（差異點 partType ↔ type） */
function readRowField(row: PartDto, zoneKey: string): unknown {
  const r = row as unknown as Record<string, unknown>;
  if (zoneKey === 'type') return r.partType;
  return r[zoneKey];
}

/** 後端 row → 編輯 draft（PART_FIELDS 對映、衛星表跳過、P5 啟用） */
export function partRowToDraft(row: PartDto): PartDraft {
  const draft: PartDraft = {};
  for (const f of PART_FIELDS) {
    if (f.isSatellite) continue;
    const v = readRowField(row, f.key);
    if (f.key === 'isOem') draft[f.key] = Boolean(v);
    else if (f.key === 'priceA' || f.key === 'priceB' || f.key === 'priceC' || f.key === 'priceD' || f.key === 'cost') {
      draft[f.key] = decimalToText(v);
    } else draft[f.key] = v == null ? '' : String(v);
  }
  return draft;
}

/** 空 draft（新增用） */
export function emptyPartDraft(): PartDraft {
  const draft: PartDraft = {};
  for (const f of PART_FIELDS) {
    if (f.isSatellite) continue;
    if (f.key === 'isOem') draft[f.key] = true;
    else if (f.key === 'uom') draft[f.key] = 'pcs';
    else if (f.key === 'returnPolicy') draft[f.key] = 'W';
    else if (f.key === 'warrantyMonths') draft[f.key] = '12';
    else draft[f.key] = '';
  }
  return draft;
}

/**
 * draft → PATCH body：對齊 v1.1 §1「只送本頁可編欄位、不覆寫其他區」
 * - editableZones=undefined 表示主檔中心、送全欄
 * - editableZones=Set 時、只送該 zones 內的 scalar 欄位
 * - 編輯模式 code 鎖死（lockedOnEdit）
 * - priceUpdatedAt/By 永遠不送（service 自動寫）
 */
const AUTO_FILLED_BY_SERVICE = new Set(['priceUpdatedAt', 'priceUpdatedBy']);

export function partDraftToBody(
  draft: PartDraft,
  editableZones: Set<PartZone> | undefined,
  options: { isCreate: boolean },
): UpdatePartBody & { code?: string; codeRuleId?: string } {
  const body: Record<string, unknown> = {};
  for (const f of PART_FIELDS) {
    if (f.isSatellite) continue;
    if (AUTO_FILLED_BY_SERVICE.has(f.key)) continue;
    if (!options.isCreate && f.key === 'code') continue; // 編輯時 code 鎖
    if (editableZones && !editableZones.has(f.zone)) continue;
    const v = draft[f.key];
    if (f.key === 'isOem') {
      body[f.key] = Boolean(v);
      continue;
    }
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (trimmed === '' && !f.required) continue;
      // 數值欄位（cost / price ABCD / warrantyMonths）轉 number
      if (
        f.key === 'cost' ||
        f.key === 'priceA' || f.key === 'priceB' || f.key === 'priceC' || f.key === 'priceD' ||
        f.key === 'warrantyMonths'
      ) {
        const n = Number(trimmed);
        if (Number.isFinite(n)) body[f.key] = n;
        continue;
      }
      // type → partType（DTO 用 partType、UI/zone 用 type）
      if (f.key === 'type') {
        body['partType'] = trimmed;
        continue;
      }
      body[f.key] = trimmed;
      continue;
    }
    body[f.key] = v;
  }
  return body as UpdatePartBody;
}

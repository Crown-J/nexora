// apps/nx-ui/src/shared/ui/filter-bar/apply.ts
/**
 * FilterRule client-side 套用 helper（業界改革 #24 v1 MVP）
 *
 * 用途：把 FilterRule[] 套用到已 fetched rows、client-side 過濾。
 * MVP 階段不接 backend API filter（business 資料量小、client-side 足夠）。
 * V2 後續軌補：backend listUsers API 擴充 filter params + frontend 自動切換 client/server filter。
 */

import type { FilterRule } from './types';

/**
 * 套用 filter rules 到 rows（全 AND 邏輯）。
 * - 空 rules：原樣回傳
 * - 一條規則不過：row 排除
 * - 規則對應 row 屬性不存在：視為 null（is-empty true / is-not-empty false / 其他 false）
 */
export function applyFilterRulesToRows<T extends Record<string, unknown>>(
  rows: T[],
  rules: FilterRule[],
): T[] {
  if (rules.length === 0) return rows;
  return rows.filter((row) => rules.every((rule) => matchRule(row, rule)));
}

/** 單一規則對單一 row 的判斷 */
function matchRule<T extends Record<string, unknown>>(row: T, rule: FilterRule): boolean {
  const fieldValue = row[rule.fieldKey];

  switch (rule.operator) {
    case 'contains':
      if (typeof rule.value !== 'string' || rule.value === '') return true;
      if (typeof fieldValue !== 'string') return false;
      return fieldValue.toLowerCase().includes(rule.value.toLowerCase());

    case 'not-contains':
      if (typeof rule.value !== 'string' || rule.value === '') return true;
      if (typeof fieldValue !== 'string') return true; // null / undefined 不含關鍵字
      return !fieldValue.toLowerCase().includes(rule.value.toLowerCase());

    case 'equals':
      if (typeof rule.value === 'boolean' && typeof fieldValue === 'boolean') {
        return fieldValue === rule.value;
      }
      return String(fieldValue ?? '') === String(rule.value ?? '');

    case 'not-equals':
      if (typeof rule.value === 'boolean' && typeof fieldValue === 'boolean') {
        return fieldValue !== rule.value;
      }
      return String(fieldValue ?? '') !== String(rule.value ?? '');

    case 'in':
      if (!Array.isArray(rule.value) || rule.value.length === 0) return true;
      return rule.value.some((v) => String(fieldValue ?? '') === String(v));

    case 'not-in':
      if (!Array.isArray(rule.value) || rule.value.length === 0) return true;
      return !rule.value.some((v) => String(fieldValue ?? '') === String(v));

    case 'is-empty':
      return isEmptyValue(fieldValue);

    case 'is-not-empty':
      return !isEmptyValue(fieldValue);

    default:
      return true;
  }
}

function isEmptyValue(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === 'string' && v.trim() === '') return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

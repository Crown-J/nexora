// apps/nx-ui/src/shared/ui/filter-bar/types.ts
/**
 * NEXORA FilterBar 型別模型（業界改革 #24 v1、Crown 拍板 B Filter Bar 範式）
 *
 * MVP 範圍：
 * - 4 種 field type：text / select / multi-select / boolean
 * - 8 種 operator：contains / not-contains / equals / not-equals / in / not-in / is-empty / is-not-empty
 * - date / number / between 範圍留後續軌（TASK-FILTER-BUILDER-V2）
 *
 * 對齊：Linear / Notion / GitHub / Airtable Filter Bar 業界範式
 */

import type { LucideIcon } from 'lucide-react';

/** Field 資料型態（影響可用 operator 與 value editor UI）*/
export type FilterFieldType = 'text' | 'select' | 'multi-select' | 'boolean';

/** Operator 完整列表（MVP 含 8 種、後續軌補 date / number 用 between / before / after / gt / lt） */
export type FilterOperator =
  | 'contains'      // text：模糊包含
  | 'not-contains'  // text：不包含
  | 'equals'        // text / select / boolean：精準等於
  | 'not-equals'    // text / select / boolean：不等於
  | 'in'            // multi-select：包含於
  | 'not-in'        // multi-select：不包含於
  | 'is-empty'      // any：欄位為空
  | 'is-not-empty'; // any：欄位非空

/** Field 定義（per-view 提供、定義可 filter 的欄位 metadata） */
export type FilterFieldDef = {
  /** 對齊 API query param key 或 row attribute key */
  key: string;
  /** UI 顯示名稱（中文）*/
  label: string;
  /** 資料型態 */
  type: FilterFieldType;
  /** select / multi-select 必填：可選值清單 */
  options?: { value: string; label: string }[];
  /** Optional：限制可用 operator（預設按 type、見 defaultOperatorsForType）*/
  allowedOperators?: FilterOperator[];
  /** Optional：UI icon（在 add popover 顯示） */
  icon?: LucideIcon;
};

/** 單一規則（FilterBar state 由 FilterRule[] 組成）*/
export type FilterRule = {
  /** uuid for React key + 規則 id（uuid 或 nanoid 皆可、本軌用 timestamp + random）*/
  id: string;
  /** 對齊 FilterFieldDef.key */
  fieldKey: string;
  /** 當前 operator（必為 field type 的 allowedOperators 之一） */
  operator: FilterOperator;
  /** 規則值（型別依 operator + fieldType 而異）：
   * - text contains / not-contains / equals / not-equals: string
   * - select equals / not-equals: string（single value）
   * - multi-select in / not-in: string[]
   * - boolean equals: boolean
   * - is-empty / is-not-empty: null（無 value）
   */
  value: string | string[] | boolean | null;
};

/** FilterBar 對外 API */
export type FilterBarProps = {
  /** per-view 可 filter 的欄位定義（如 user：信箱 / 電話 / 啟用 / 職務 / ...）*/
  fields: FilterFieldDef[];
  /** 當前已套用規則（受控 state、parent 持有）*/
  rules: FilterRule[];
  /** 規則變更 callback（add / edit / remove 統一觸發）*/
  onChange: (rules: FilterRule[]) => void;
  /** Optional：「+ 篩選」button label（預設「篩選」）*/
  addLabel?: string;
  /** Optional：integ 容器 className */
  className?: string;
};

/**
 * 依 field type 推預設可用 operator（caller 未提供 allowedOperators 時 fallback）。
 * MVP 範圍、後續軌（V2）擴 date / number。
 */
export function defaultOperatorsForType(type: FilterFieldType): FilterOperator[] {
  switch (type) {
    case 'text':
      return ['contains', 'not-contains', 'equals', 'not-equals', 'is-empty', 'is-not-empty'];
    case 'select':
      return ['equals', 'not-equals', 'is-empty', 'is-not-empty'];
    case 'multi-select':
      return ['in', 'not-in', 'is-empty', 'is-not-empty'];
    case 'boolean':
      return ['equals'];
  }
}

/** Operator 中文標籤（chip 顯示用） */
export const OPERATOR_LABEL: Record<FilterOperator, string> = {
  contains: '包含',
  'not-contains': '不包含',
  equals: '=',
  'not-equals': '≠',
  in: '屬於',
  'not-in': '不屬於',
  'is-empty': '為空',
  'is-not-empty': '不為空',
};

/** 該 operator 是否需要 value editor（is-empty / is-not-empty 無需） */
export function operatorNeedsValue(op: FilterOperator): boolean {
  return op !== 'is-empty' && op !== 'is-not-empty';
}

/** 生成 FilterRule id（timestamp + random、避免衝突）*/
export function genRuleId(): string {
  return `fr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 格式化規則 chip 顯示文字。
 * - 例「職務 = 業務」「信箱 包含 @gmail」「啟用 = ✓」「電話 為空」
 */
export function formatRuleChip(rule: FilterRule, field: FilterFieldDef): string {
  const opLabel = OPERATOR_LABEL[rule.operator];
  if (!operatorNeedsValue(rule.operator)) {
    return `${field.label} ${opLabel}`;
  }
  if (field.type === 'boolean') {
    const v = rule.value === true ? '✓' : '✗';
    return `${field.label} ${opLabel} ${v}`;
  }
  if (field.type === 'multi-select' && Array.isArray(rule.value)) {
    const opts = field.options ?? [];
    const labels = rule.value.map((v) => opts.find((o) => o.value === v)?.label ?? v);
    return labels.length <= 2
      ? `${field.label} ${opLabel} ${labels.join('、')}`
      : `${field.label} ${opLabel} ${labels.slice(0, 2).join('、')} +${labels.length - 2}`;
  }
  if (field.type === 'select' && typeof rule.value === 'string') {
    const opt = field.options?.find((o) => o.value === rule.value);
    return `${field.label} ${opLabel} ${opt?.label ?? rule.value}`;
  }
  if (typeof rule.value === 'string') {
    const display = rule.value.length > 12 ? `${rule.value.slice(0, 12)}…` : rule.value;
    return `${field.label} ${opLabel} ${display}`;
  }
  return `${field.label} ${opLabel}`;
}

// apps/nx-ui/src/features/master-shell/entity-master/config.ts
/**
 * EntityMasterPage — config 型別 + 通用 REST API helper
 *
 * 鋼鐵星球範式的 config-driven 通用主檔。對齊 NEXORA code-master REST 模式：
 *   GET    {basePath}?search=&page=&pageSize=&isActive=   列表（PagedResult）
 *   POST   {basePath}                                      新增
 *   PATCH  {basePath}/:id                                  更正
 *   PATCH  {basePath}/:id/active   { isActive }            軟刪除 / 啟用（系統不刪資料）
 *
 * 簡單平面主檔（幣別 / 國家 / 零件群組 / 車體類型 …）用一份 config 即可套用，
 * 取代舊「彈窗範式」BaseModalCodeMasterView。
 */

import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';
import type { PagedResult } from '@data/types/nx01/api';

// T3 進貨對齊批次 2026-06-07：加 'date' 支援 PartnerPart 主檔的 validFrom / validTo
// 等通用 date 欄位（HTML5 input type="date"、後端接 ISO 'YYYY-MM-DD'）。
export type FieldType = 'text' | 'number' | 'toggle' | 'select' | 'ref' | 'textarea' | 'json' | 'computed' | 'date';

/** 送後端的 body（json 欄位值為物件 / 陣列，故放寬型別） */
export type EntityBody = Record<string, unknown>;

export type SelectOption = { value: string | number; label: string };

export type EntityFieldDef = {
  /** 對應後端 DTO / row 欄位名 */
  key: string;
  label: string;
  /** 預設 'text' */
  type?: FieldType;
  /** 編輯模式必填（空值擋存檔） */
  required?: boolean;
  /** 文字欄位最小長度（提交時擋、含 trim 後字數）；02 第四批 軌 4 2026-06-07 新增 */
  minLength?: number;
  /** 文字欄位最大長度（native input maxLength 硬限）；02 第四批 軌 4 2026-06-07 新增 */
  maxLength?: number;
  /** 送出前轉大寫（code 類） */
  uppercase?: boolean;
  /** 不 trim、且空字串也照送（如分隔符可為空格 / 空字串「無」） */
  noTrim?: boolean;
  /** 編輯既有資料時不可改（如 code 主鍵語意） */
  lockedOnEdit?: boolean;
  /** 是否在列表顯示為一欄（預設 true） */
  inList?: boolean;
  /** 列表欄寬 Tailwind 字面值 e.g. 'min-w-[140px]' */
  minWidthClass?: string;
  /** 等寬字（code / 數字） */
  mono?: boolean;
  placeholder?: string;
  /** 新增時的預設值 */
  defaultValue?: string | number | boolean;

  // ── type 'select'（靜態 enum 下拉）──
  /** select 選項（enum 碼 → 中文標籤） */
  options?: SelectOption[];
  /** select / number 值送後端時轉 number（SmallInt enum 碼用） */
  numeric?: boolean;

  // ── type 'ref'（外鍵下拉，從另一主檔 endpoint 載入）──
  /** ref 來源主檔 endpoint，e.g. 'nx01/brands' */
  refBasePath?: string;
  /** 組 option label 的欄位（預設 ['code','name']），e.g. ['name'] */
  refLabelKeys?: string[];
  /** row 上對應的「顯示名稱」欄位（後端 join 帶出時用；否則以載入的 options 對照） */
  refDisplayKey?: string;
  /** W6-切換軌 2026-06-06：picker 額外 query filter（如 isCar=true / isPart=true）*/
  refExtraFilters?: Record<string, string>;

  // ── type 'computed'（唯讀即時預覽，不存 DB、不送後端）──
  /** 依目前表單值即時計算顯示字串（如料號分段預覽）；editing 時讀 draft、瀏覽時讀 row */
  compute?: (values: Record<string, unknown>) => string;
};

export type EntityMasterConfig = {
  /** REST endpoint root，e.g. '/currency' */
  basePath: string;
  /** sidebar / header 分類，e.g. '系統設定' */
  category: string;
  /** 主檔標題，e.g. '幣別基本資料' */
  title: string;
  /** 實體名詞（toast / 確認框用），e.g. '幣別' */
  entityNoun: string;
  /** 欄位定義（編輯表單 + 列表共用） */
  fields: EntityFieldDef[];
  /** 觀測用 error code 前綴，e.g. 'nxui_base_currency' */
  errorCodePrefix?: string;
  /** 進入此主檔的最低方案（未指定 = LITE） */
  minPlan?: 'LITE' | 'PLUS' | 'PRO';
  /**
   * 停用約定（後端不統一）：
   * - 'active-toggle'（預設）：PATCH {basePath}/:id/active { isActive }（幣別/國家/零件群組群）
   * - 'soft-delete-rest'：停用 DELETE {basePath}/:id；啟用 PATCH {basePath}/:id { isActive:true }（nx01/複數 群）
   * - 'update-active'：停用 / 啟用都走 PATCH {basePath}/:id { isActive }（customer-grade 固定表）
   */
  deleteMode?: 'active-toggle' | 'soft-delete-rest' | 'update-active';
  /** 是否可新增（customer-grade/warehouse-type 等固定表為 false、隱藏 A 鍵） */
  canCreate?: boolean;
  /** 唯讀主檔（warehouse-type 系統表）：隱藏新增 / 更正 / 停用 */
  readOnly?: boolean;
};

/** 後端 code-master 通用 row 形狀（audit 欄位固定、業務欄位動態） */
export type EntityRow = {
  id: string;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdByUsername?: string | null;
  createdByName?: string | null;
  updatedByUsername?: string | null;
  updatedByName?: string | null;
  [key: string]: unknown;
};

export type EntityDraft = Record<string, string | number | boolean>;

// ──────────────────────────────────────────────────────────────
// REST helper（config.basePath 驅動）
// ──────────────────────────────────────────────────────────────

export async function fetchEntityList(
  cfg: EntityMasterConfig,
  params: { search?: string; page?: number; pageSize?: number; isActive?: boolean },
): Promise<PagedResult<EntityRow>> {
  const qs = buildQueryString({
    search: params.search?.trim() || undefined,
    page: params.page != null ? String(params.page) : undefined,
    pageSize: params.pageSize != null ? String(params.pageSize) : undefined,
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
  });
  const res = await apiFetch(`${cfg.basePath}${qs}`, { method: 'GET' });
  await assertOk(res, `${cfg.errorCodePrefix ?? 'nxui_entity'}_list`);
  // ⚠️ NEXORA 後端 list 回傳 key 不一致：code-master 系列用 `rows`、user-role/warehouse 用 `items`。
  // 此處正規化為 PagedResult.items，讓 generic page 統一讀 items。
  const data = (await res.json()) as {
    page: number;
    pageSize: number;
    total: number;
    items?: EntityRow[];
    rows?: EntityRow[];
  };
  return {
    page: data.page,
    pageSize: data.pageSize,
    total: data.total,
    items: data.items ?? data.rows ?? [],
  };
}

export async function createEntity(cfg: EntityMasterConfig, body: EntityBody): Promise<EntityRow> {
  const res = await apiFetch(cfg.basePath, { method: 'POST', body: JSON.stringify(body) });
  await assertOk(res, `${cfg.errorCodePrefix ?? 'nxui_entity'}_create`);
  return res.json() as Promise<EntityRow>;
}

export async function updateEntity(
  cfg: EntityMasterConfig,
  id: string,
  body: EntityBody,
): Promise<EntityRow> {
  const res = await apiFetch(`${cfg.basePath}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  await assertOk(res, `${cfg.errorCodePrefix ?? 'nxui_entity'}_update`);
  return res.json() as Promise<EntityRow>;
}

export async function setEntityActive(
  cfg: EntityMasterConfig,
  id: string,
  isActive: boolean,
): Promise<EntityRow | null> {
  const tag = `${cfg.errorCodePrefix ?? 'nxui_entity'}_active`;
  const idEnc = encodeURIComponent(id);
  const mode = cfg.deleteMode ?? 'active-toggle';
  if (mode === 'update-active') {
    // 停用 / 啟用都走 PATCH :id { isActive }（customer-grade 固定表）
    const res = await apiFetch(`${cfg.basePath}/${idEnc}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
    await assertOk(res, tag);
    return res.json() as Promise<EntityRow>;
  }
  if (mode === 'soft-delete-rest') {
    if (!isActive) {
      // 停用 = DELETE（後端內部 soft delete、保留資料）
      const res = await apiFetch(`${cfg.basePath}/${idEnc}`, { method: 'DELETE' });
      await assertOk(res, tag);
      return null;
    }
    // 啟用 = PATCH update isActive:true
    const res = await apiFetch(`${cfg.basePath}/${idEnc}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: true }),
    });
    await assertOk(res, tag);
    return res.json() as Promise<EntityRow>;
  }
  // active-toggle 約定
  const res = await apiFetch(`${cfg.basePath}/${idEnc}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
  await assertOk(res, tag);
  return res.json() as Promise<EntityRow>;
}

/** 載入外鍵下拉選項（ref 欄位用）：list active → {value:id, label}
 *  W6-切換軌 2026-06-06：加 extraFilters 第三 arg，picker 可帶 isPart=true / isCar=true 等 query 過濾 */
export async function fetchRefOptions(
  refBasePath: string,
  labelKeys: string[] = ['code', 'name'],
  extraFilters?: Record<string, string>,
): Promise<SelectOption[]> {
  const qs = buildQueryString({
    pageSize: '100',
    isActive: 'true',
    ...(extraFilters ?? {}),
  });
  const res = await apiFetch(`${refBasePath}${qs}`, { method: 'GET' });
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: EntityRow[]; rows?: EntityRow[] };
  const list = data.items ?? data.rows ?? [];
  return list.map((r) => ({
    value: r.id,
    label: labelKeys.map((k) => r[k]).filter(Boolean).join(' · ') || r.id,
  }));
}

/** 把後端 row 轉成編輯 draft（依 config.fields） */
export function rowToDraft(cfg: EntityMasterConfig, row: EntityRow): EntityDraft {
  const draft: EntityDraft = {};
  for (const f of cfg.fields) {
    if (f.type === 'computed') continue; // 計算欄位不入 draft
    const v = row[f.key];
    if (f.type === 'toggle') draft[f.key] = Boolean(v);
    else if (f.type === 'json') draft[f.key] = v == null ? '' : JSON.stringify(v, null, 2);
    else if (f.type === 'date') {
      // T3：date 欄位後端回 ISO 8601 字串（'YYYY-MM-DDTHH:mm:ss.sssZ' 或 'YYYY-MM-DD'），
      // input type="date" 需 'YYYY-MM-DD' 才能正確顯示。
      draft[f.key] = v == null || v === '' ? '' : String(v).slice(0, 10);
    } else draft[f.key] = v == null ? '' : String(v);
  }
  return draft;
}

/** 空白 draft（新增用） */
export function emptyDraft(cfg: EntityMasterConfig): EntityDraft {
  const draft: EntityDraft = {};
  for (const f of cfg.fields) {
    if (f.type === 'computed') continue; // 計算欄位不入 draft
    if (f.defaultValue !== undefined) draft[f.key] = f.defaultValue;
    else if (f.type === 'toggle') draft[f.key] = true;
    else draft[f.key] = '';
  }
  return draft;
}

/** draft → 送出 body（uppercase / number / json 轉換、空 optional 不送以免後端驗證打空值） */
export function draftToBody(cfg: EntityMasterConfig, draft: EntityDraft): EntityBody {
  const body: EntityBody = {};
  for (const f of cfg.fields) {
    if (f.type === 'computed') continue; // 計算欄位不送後端
    let v = draft[f.key];
    if (f.type === 'toggle') {
      body[f.key] = Boolean(v);
      continue;
    }
    if (f.type === 'json') {
      const raw = String(v ?? '').trim();
      if (!raw) {
        if (f.required) body[f.key] = [];
        continue;
      }
      try {
        body[f.key] = JSON.parse(raw);
      } catch {
        // 解析失敗：原樣送字串、交後端驗證回報（前端不擅自吞錯）
        body[f.key] = raw;
      }
      continue;
    }
    if (typeof v === 'string' && !f.noTrim) {
      v = v.trim();
      if (f.uppercase) v = v.toUpperCase();
    }
    // 空的非必填欄位不送（避免 optional FK / enum / 字串被空值驗證擋下）；
    // noTrim 欄位（如分隔符）即使空字串也照送（空字串＝「無」是有效值）
    if ((v === '' || v == null) && !f.required && !f.noTrim) continue;
    if (f.type === 'number' || (f.type === 'select' && f.numeric)) {
      const n = Number(v);
      if (Number.isFinite(n)) body[f.key] = n;
      else if (f.required) body[f.key] = 0;
      continue;
    }
    body[f.key] = v;
  }
  return body;
}

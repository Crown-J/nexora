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
 * 取代舊「彈窗範式」BaseNx00ModalCodeMasterView。
 */

import { apiFetch } from '@/shared/api/client';
import { buildQueryString } from '@/shared/api/query';
import { assertOk } from '@/shared/api/http';
import type { PagedResult } from '@/features/base/api/types';

export type FieldType = 'text' | 'number' | 'toggle';

export type EntityFieldDef = {
  /** 對應後端 DTO / row 欄位名 */
  key: string;
  label: string;
  /** 預設 'text' */
  type?: FieldType;
  /** 編輯模式必填（空值擋存檔） */
  required?: boolean;
  /** 送出前轉大寫（code 類） */
  uppercase?: boolean;
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
};

export type EntityMasterConfig = {
  /** REST endpoint root，e.g. '/currency' */
  basePath: string;
  /** sidebar / header 分類，e.g. '系統設定' */
  category: string;
  /** 主檔標題，e.g. '幣別主檔' */
  title: string;
  /** 實體名詞（toast / 確認框用），e.g. '幣別' */
  entityNoun: string;
  /** 欄位定義（編輯表單 + 列表共用） */
  fields: EntityFieldDef[];
  /** 觀測用 error code 前綴，e.g. 'nxui_base_currency' */
  errorCodePrefix?: string;
  /** 進入此主檔的最低方案（未指定 = LITE） */
  minPlan?: 'LITE' | 'PLUS' | 'PRO';
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

export async function createEntity(cfg: EntityMasterConfig, body: EntityDraft): Promise<EntityRow> {
  const res = await apiFetch(cfg.basePath, { method: 'POST', body: JSON.stringify(body) });
  await assertOk(res, `${cfg.errorCodePrefix ?? 'nxui_entity'}_create`);
  return res.json() as Promise<EntityRow>;
}

export async function updateEntity(
  cfg: EntityMasterConfig,
  id: string,
  body: EntityDraft,
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
): Promise<EntityRow> {
  const res = await apiFetch(`${cfg.basePath}/${encodeURIComponent(id)}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
  await assertOk(res, `${cfg.errorCodePrefix ?? 'nxui_entity'}_active`);
  return res.json() as Promise<EntityRow>;
}

/** 把後端 row 轉成編輯 draft（依 config.fields） */
export function rowToDraft(cfg: EntityMasterConfig, row: EntityRow): EntityDraft {
  const draft: EntityDraft = {};
  for (const f of cfg.fields) {
    const v = row[f.key];
    if (f.type === 'toggle') draft[f.key] = Boolean(v);
    else if (f.type === 'number') draft[f.key] = v == null ? '' : String(v);
    else draft[f.key] = v == null ? '' : String(v);
  }
  return draft;
}

/** 空白 draft（新增用） */
export function emptyDraft(cfg: EntityMasterConfig): EntityDraft {
  const draft: EntityDraft = {};
  for (const f of cfg.fields) {
    if (f.defaultValue !== undefined) draft[f.key] = f.defaultValue;
    else if (f.type === 'toggle') draft[f.key] = true;
    else draft[f.key] = '';
  }
  return draft;
}

/** draft → 送出 body（uppercase / number 轉換、移除空 optional） */
export function draftToBody(cfg: EntityMasterConfig, draft: EntityDraft): EntityDraft {
  const body: EntityDraft = {};
  for (const f of cfg.fields) {
    let v = draft[f.key];
    if (f.type === 'toggle') {
      body[f.key] = Boolean(v);
      continue;
    }
    if (typeof v === 'string') {
      v = v.trim();
      if (f.uppercase) v = v.toUpperCase();
    }
    if (f.type === 'number') {
      const n = Number(v);
      body[f.key] = Number.isFinite(n) ? n : 0;
      continue;
    }
    body[f.key] = v;
  }
  return body;
}

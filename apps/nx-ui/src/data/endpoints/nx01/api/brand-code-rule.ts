// apps/nx-ui/src/features/base/api/brand-code-rule.ts
// 廠牌料號規則 API client（下半場 A 軸翻轉後）：供零件主檔讀規則 SEG 設定 + 分隔符。
import { apiFetch } from '@data/api/client';
import { buildQueryString } from '@data/api/query';
import { assertOk } from '@data/api/http';
import { clampNx01ListPageSize } from '@data/utils/nx01Pagination';
import type { PagedResult } from '@data/types/nx01/api';

export type BrandCodeRuleDto = {
  id: string;
  partBrandId: string;
  name: string;
  description: string | null;
  seg1Length: number;
  seg2Length: number;
  seg3Length: number;
  seg4Length: number;
  seg5Length: number;
  isActive: boolean;
};

const BASE = '/nx01/brand-code-rules';

function normalizePaged<T>(raw: unknown): PagedResult<T> {
  const j = raw as Record<string, unknown>;
  const items = (Array.isArray(j.items) ? j.items : Array.isArray(j.rows) ? j.rows : []) as T[];
  return { items, page: Number(j.page ?? 1), pageSize: Number(j.pageSize ?? 20), total: Number(j.total ?? 0) };
}

export async function listBrandCodeRules(params: {
  q?: string;
  partBrandId?: string;
  page?: number;
  pageSize?: number;
  isActive?: boolean;
}): Promise<PagedResult<BrandCodeRuleDto>> {
  const pageSize = clampNx01ListPageSize(params.pageSize, 100);
  const qs = buildQueryString({
    search: params.q?.trim() || undefined,
    partBrandId: params.partBrandId?.trim() || undefined,
    page: params.page != null ? String(params.page) : undefined,
    pageSize: String(pageSize),
    isActive: params.isActive === undefined ? undefined : String(params.isActive),
  });
  const res = await apiFetch(`${BASE}${qs}`, { method: 'GET' });
  await assertOk(res, 'nxui_base_brand_code_rule_list');
  return normalizePaged<BrandCodeRuleDto>(await res.json());
}

/** 規則 SEG 長度陣列（seg4/5 為 0 表不使用） */
export function ruleSegLengths(r: BrandCodeRuleDto): number[] {
  return [r.seg1Length, r.seg2Length, r.seg3Length, r.seg4Length, r.seg5Length];
}

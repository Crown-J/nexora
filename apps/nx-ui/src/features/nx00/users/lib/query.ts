/**
 * File: apps/nx-ui/src/features/nx00/users/lib/query.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-USERS-QUERY-001：Users List 的 URL Query 解析與組裝
 *
 * Notes:
 * - 集中處理 page/pageSize/q 的預設值與規則
 * - 讓 page / hook 不需要重複寫 URLSearchParams 相關邏輯
 */

import type { ReadonlyURLSearchParams } from 'next/navigation';

export type UsersListQuery = {
  page: number;
  pageSize: number;
  q: string;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

function toPositiveInt(value: string | null, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return i >= 1 ? i : fallback;
}

/**
 * @CODE nxui_nx00_users_query_parse_001
 * 說明：
 * - 解析 query 參數（帶預設值）
 * - 預設 page=1, pageSize=20, q=''
 * - 自動防呆：NaN / 小於 1 的值會被修正
 */
export function parseUsersListQuery(sp: ReadonlyURLSearchParams): UsersListQuery {
  const page = toPositiveInt(sp.get('page'), DEFAULT_PAGE);
  const pageSize = toPositiveInt(sp.get('pageSize'), DEFAULT_PAGE_SIZE);
  const q = sp.get('q') ?? '';

  return { page, pageSize, q };
}

/**
 * @CODE nxui_nx00_users_query_build_next_001
 * 說明：
 * - 建立下一個 URLSearchParams（集中處理規則）
 * - 規則：
 *   1) page/pageSize 若有提供就 set（並做 >=1 修正）
 *   2) q 會 trim，空字串就 delete q
 *   3) 當 q 有變更時，會重置 page=1（避免搜尋後落在不存在頁）
 */
export function buildNextUsersListSearchParams(
  current: URLSearchParams,
  params: { page?: number; pageSize?: number; q?: string }
): URLSearchParams {
  const next = new URLSearchParams(current.toString());

  if (params.page !== undefined) {
    const p = Math.floor(params.page);
    next.set('page', String(p >= 1 ? p : DEFAULT_PAGE));
  }

  if (params.pageSize !== undefined) {
    const ps = Math.floor(params.pageSize);
    next.set('pageSize', String(ps >= 1 ? ps : DEFAULT_PAGE_SIZE));
  }

  if (params.q !== undefined) {
    const nextQ = params.q.trim();

    if (nextQ) next.set('q', nextQ);
    else next.delete('q');

    // 搜尋條件變動時，頁碼重置
    next.set('page', String(DEFAULT_PAGE));
  }

  return next;
}
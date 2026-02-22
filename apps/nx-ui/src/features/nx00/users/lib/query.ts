/**
 * File: apps/nx-ui/src/features/nx00/users/lib/query.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USERS-QUERY-001：Users List 的 URL Query 解析與組裝
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

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-QUERY-001-F01
 * 說明：
 * - 解析 query 參數（帶預設值）
 * - 預設 page=1, pageSize=20, q=''
 * - 自動防呆：NaN / 小於 1 的值會被修正
 */
export function parseUsersListQuery(sp: ReadonlyURLSearchParams): UsersListQuery {
  const rawPage = Number(sp.get('page') || '1');
  const rawPageSize = Number(sp.get('pageSize') || '20');

  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const pageSize = Number.isFinite(rawPageSize) && rawPageSize >= 1 ? rawPageSize : 20;

  const q = sp.get('q') || '';
  return { page, pageSize, q };
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-QUERY-001-F02
 * 說明：
 * - 建立下一個 URLSearchParams（集中處理規則）
 * - 規則：
 *   1) page/pageSize 若有提供就 set
 *   2) q 會 trim，空字串就 delete q
 *   3) 當 q 有變更時，會重置 page=1（避免搜尋後落在不存在頁）
 */
export function buildNextUsersListSearchParams(
  current: URLSearchParams,
  params: { page?: number; pageSize?: number; q?: string }
): URLSearchParams {
  const next = new URLSearchParams(current.toString());

  if (params.page !== undefined) next.set('page', String(params.page));
  if (params.pageSize !== undefined) next.set('pageSize', String(params.pageSize));

  if (params.q !== undefined) {
    const nextQ = params.q.trim();
    if (nextQ) next.set('q', nextQ);
    else next.delete('q');

    // 搜尋條件變動時，頁碼重置
    next.set('page', '1');
  }

  return next;
}
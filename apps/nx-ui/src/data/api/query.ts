/**
 * File: apps/nx-ui/src/shared/api/query.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-002：QueryString 工具（URLSearchParams 封裝）
 *
 * Notes:
 * - 忽略 undefined 與空字串
 * - boolean/number 建議在呼叫端轉成 string
 */

export function buildQueryString(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();

  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') sp.set(k, v);
  });

  const s = sp.toString();
  return s ? `?${s}` : '';
}
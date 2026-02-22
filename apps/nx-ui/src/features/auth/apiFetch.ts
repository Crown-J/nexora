/**
 * File: apps/nx-ui/src/features/auth/apiFetch.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-AUTH-003：統一封裝 fetch（自動帶 Bearer token）
 * - 後續 NX00-API-001 / NX00-API-002 都可以共用
 *
 * Notes:
 * - baseUrl 來自 NEXT_PUBLIC_API_URL
 * - token 來自 localStorage（getToken）
 * - 若回 401：代表 token 過期/無效，交由呼叫端決定要不要清 token / redirect
 */

import { getToken } from '@/features/auth/token';

export type ApiFetchOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
};

/**
 * @CODE nxui_auth_apifetch_001
 * 說明：
 * - 自動帶 Authorization: Bearer <token>
 * - 自動加 Content-Type: application/json（若 body 是 string）
 * - 回傳 Response（讓呼叫端自行處理狀態碼、文字或 JSON）
 */
export async function apiFetch(path: string, opts: ApiFetchOptions = {}) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error('[nxui_auth_apifetch_001] NEXT_PUBLIC_API_URL is not set');
  }

  const token = getToken();

  const headers: Record<string, string> = {
    ...(opts.headers ?? {}),
  };

  // @CODE nxui_auth_apifetch_attach_bearer_001：若有 token，自動帶 Bearer
  if (token) headers.Authorization = `Bearer ${token}`;

  // @CODE nxui_auth_apifetch_attach_content_type_001：若 body 是字串（通常 JSON.stringify），補 Content-Type
  const hasContentType = Object.keys(headers).some((k) => k.toLowerCase() === 'content-type');
  if (opts.body && typeof opts.body === 'string' && !hasContentType) {
    headers['Content-Type'] = 'application/json';
  }

  // @CODE nxui_auth_apifetch_do_fetch_001：執行 fetch
  const res = await fetch(`${baseUrl}${path}`, {
    ...opts,
    headers,
  });

  return res;
}

/**
 * @CODE nxui_auth_apijson_001
 * 說明：
 * - 在 apiFetch 基礎上，直接解析 JSON 並回傳 <T>
 * - 若非 2xx：丟出 Error（訊息優先用 res.text()）
 * - 401 不在此自動清 token（依規範：交由呼叫端決定）
 */
export async function apiJson<T>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  const res = await apiFetch(path, opts);

  // @CODE nxui_auth_apijson_http_error_001：非 2xx 統一丟錯
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(msg || `[nxui_auth_apijson_001] HTTP ${res.status}`);
  }

  // @CODE nxui_auth_apijson_parse_001：解析 JSON
  return (await res.json()) as T;
}

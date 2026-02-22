/**
 * File: apps/nx-ui/src/features/auth/token.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-AUTH-003：前端 access token 儲存/讀取/清除（localStorage）
 *
 * Notes:
 * - SSR safe：在 server side 不操作 window/localStorage
 * - Storage safe：localStorage 可能因瀏覽器政策/隱私模式而丟例外，需容錯
 */

import { AUTH_ACCESS_TOKEN_KEY } from './constants';

/**
 * @CODE nxui_auth_token_is_browser_001
 * 說明：判斷是否在瀏覽器環境（避免 SSR 觸發 window undefined）
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * @CODE nxui_auth_token_set_002
 * 說明：
 * - 儲存 access token 至 localStorage
 * - 若 localStorage 不可用：吞錯（避免影響 UI）
 */
export function setToken(token: string): void {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(AUTH_ACCESS_TOKEN_KEY, token);
  } catch {
    // ignore: storage might be unavailable (private mode / blocked / quota)
  }
}

/**
 * @CODE nxui_auth_token_get_002
 * 說明：
 * - 從 localStorage 讀取 access token
 * - 若 localStorage 不可用：回傳 null
 */
export function getToken(): string | null {
  if (!isBrowser()) return null;

  try {
    return window.localStorage.getItem(AUTH_ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * @CODE nxui_auth_token_clear_002
 * 說明：
 * - 清除 localStorage 的 access token
 * - 若 localStorage 不可用：吞錯
 */
export function clearToken(): void {
  if (!isBrowser()) return;

  try {
    window.localStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
  } catch {
    // ignore
  }
}
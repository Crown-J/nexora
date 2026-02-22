/**
 * File: apps/nx-ui/src/features/auth/token.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-AUTH-003：前端 token 儲存/讀取/清除（localStorage）
 */

import { NX00_TOKEN_KEY } from './constants';

/**
 * @CODE nxui_auth_token_set_001
 */
export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(NX00_TOKEN_KEY, token);
}

/**
 * @CODE nxui_auth_token_get_001
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(NX00_TOKEN_KEY);
}

/**
 * @CODE nxui_auth_token_clear_001
 */
export function clearToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(NX00_TOKEN_KEY);
}

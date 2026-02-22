/**
 * File: apps/nx-ui/src/features/auth/api/me.ts
 * Project: NEXORA (Monorepo)
 * Purpose:
 * - NX00-AUTH-003 驗證 token 可用性（/auth/me）
 * - 提供前端 RBAC 判斷（roles）
 *
 * Notes:
 * - 改用 apiFetch：自動帶 Bearer token
 * - 若 401：丟出帶狀態碼的錯誤，讓呼叫端決定要不要清 token/導頁
 */

import { apiFetch } from '@/features/auth/apiFetch';

export type MeResponse = {
  id: string;
  username: string;

  // 相容 snake/camel
  display_name?: string | null;
  displayName?: string | null;

  // ✅ RBAC: 後端 /auth/me 建議回傳 roles
  roles?: string[];
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * @CODE nxui_auth_me_fetch_002
 */
export async function callMeApi(): Promise<MeResponse> {
  const res = await apiFetch('/auth/me', { method: 'GET' });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(res.status, `me failed: ${res.status} ${text}`);
  }

  return (await res.json()) as MeResponse;
}

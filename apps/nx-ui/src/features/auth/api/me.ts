/**
 * File: apps/nx-ui/src/features/auth/api/me.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-AUTH-004：驗證 token 可用性（/auth/me）
 * - 提供前端 RBAC 判斷（roles）
 *
 * Notes:
 * - 改用 shared apiJson：統一錯誤型別與 baseUrl/token 行為
 * - 401：不在此自動清 token（交由呼叫端決定）
 */

import { apiJson } from '@/shared/api/client';
import type { MeResponse } from '@/features/auth/types';

/**
 * @CODE nxui_nx00_auth_me_callapi_001
 * 說明：
 * - GET /auth/me
 * - 回傳使用者資料與 roles（若後端有提供）
 */
export async function callMeApi(): Promise<MeResponse> {
  return apiJson<MeResponse>('/auth/me', { method: 'GET' });
}
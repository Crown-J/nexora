// apps/nx-ui/src/features/platform/auth/api.ts
// 平台層 vs 租戶層分離軌 Phase 4/5：平台 auth API client

import { platformFetch } from '../api/client';

export type PlatformMe = {
  id: string;
  account: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
  scope: 'platform';
};

export type PlatformLoginResponse = {
  token: string;
  user: {
    id: string;
    account: string;
    display_name: string;
  };
};

export function getPlatformMe(): Promise<PlatformMe> {
  return platformFetch<PlatformMe>('/platform/auth/me');
}

/**
 * Phase 5：平台超管登入。
 * 注意：不沾 tenantCode、不走客戶端 callLoginApi、跟 /auth/login 完全分流。
 */
export function platformLogin(account: string, password: string): Promise<PlatformLoginResponse> {
  return platformFetch<PlatformLoginResponse>('/platform/auth/login', {
    method: 'POST',
    body: JSON.stringify({ account, password }),
  });
}

/**
 * Phase 6.1：平台超管改密碼。
 * - mustChangePassword=true 時、oldPassword 可空字串（後端允許跳過驗舊密）
 * - mustChangePassword=false 時、必須帶正確 oldPassword、否則 PL-201
 * - newPassword < 6 字元 → PL-303
 */
export function platformChangePassword(
  oldPassword: string,
  newPassword: string,
): Promise<{ ok: boolean }> {
  return platformFetch<{ ok: boolean }>('/platform/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ oldPassword, newPassword }),
  });
}

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

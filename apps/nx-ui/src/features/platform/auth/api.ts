// apps/nx-ui/src/features/platform/auth/api.ts
// 平台層 vs 租戶層分離軌 Phase 4：平台 auth API client

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

export function getPlatformMe(): Promise<PlatformMe> {
  return platformFetch<PlatformMe>('/platform/auth/me');
}

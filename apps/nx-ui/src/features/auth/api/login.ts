import { apiJson } from '@/shared/api/client';
import { NEXORA_DEMO_ACCESS_TOKEN } from '@/features/auth/constants';
import { setDemoSessionUsername } from '@/features/auth/demo-session';
import { isNexoraDemoMode } from '@/features/auth/run-mode';
import type { LoginRequest, LoginResponse } from '@/features/auth/types';

/**
 * @CODE nxui_nx00_auth_login_callapi_004
 */
export async function callLoginApi(
  payload: LoginRequest
): Promise<LoginResponse> {
  if (isNexoraDemoMode()) {
    const account = String(payload.account ?? '').trim() || 'demo';
    setDemoSessionUsername(account);
    return {
      token: NEXORA_DEMO_ACCESS_TOKEN,
      user: {
        id: 'nexora-demo-user',
        username: account,
        display_name: '展示模式',
      },
    };
  }

  return apiJson<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: payload.account,
      password: payload.password,
    }),
  });
}
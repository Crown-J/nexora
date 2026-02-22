import { apiJson } from '@/shared/api/client';
import type { LoginRequest, LoginResponse } from '@/features/auth/types';

/**
 * @CODE nxui_nx00_auth_login_callapi_004
 */
export async function callLoginApi(
  payload: LoginRequest
): Promise<LoginResponse> {
  return apiJson<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: payload.account,
      password: payload.password,
    }),
  });
}
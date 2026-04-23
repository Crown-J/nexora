import { apiJson } from '@/shared/api/client';
import {
  NEXORA_DEMO_ACCESS_TOKEN,
  NEXORA_DEMO_LOGIN_PASSWORD,
  NEXORA_DEMO_LOGIN_USERNAME,
} from '@/features/auth/constants';
import {
  setDemoSessionTenantCode,
  setDemoSessionUsername,
} from '@/features/auth/demo-session';
import { isNexoraDemoMode } from '@/features/auth/run-mode';
import type { LoginRequest, LoginResponse } from '@/features/auth/types';

/**
 * @CODE nxui_nx00_auth_login_callapi_004
 *
 * R4A-FIX：無論走哪條 login path（demo 短路或真實 API），登入成功後都把
 * 輸入的 tenantCode 寫到 sessionStorage。即便 NEXT_PUBLIC_DEMO_MODE=true
 * 讓 useSessionMe 改用 DEMO_USER 而非打 /auth/me，DEMO_USER 仍能從
 * sessionStorage 動態推出 TEST-LITE / TEST-PLUS / TEST-PRO 對應的 plan code。
 */
export async function callLoginApi(
  payload: LoginRequest
): Promise<LoginResponse> {
  const tenantCode = String(payload.tenantCode ?? '').trim();

  if (isNexoraDemoMode()) {
    const account = String(payload.account ?? '').trim();
    const password = String(payload.password ?? '');
    if (account !== NEXORA_DEMO_LOGIN_USERNAME || password !== NEXORA_DEMO_LOGIN_PASSWORD) {
      throw new Error('帳號或密碼錯誤');
    }
    setDemoSessionUsername(account);
    setDemoSessionTenantCode(tenantCode);
    return {
      token: NEXORA_DEMO_ACCESS_TOKEN,
      user: {
        id: 'nexora-demo-user',
        username: account,
        display_name: '展示模式',
      },
    };
  }

  const response = await apiJson<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      tenantCode,
      username: payload.account,
      password: payload.password,
    }),
  });
  // 即便走真實 API，也記下 tenantCode 給 demo-mode 的 useSessionMe 讀
  setDemoSessionTenantCode(tenantCode);
  return response;
}
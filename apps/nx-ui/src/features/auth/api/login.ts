/**
 * File: apps/nx-ui/src/features/auth/api/login.ts
 * Project: NEXORA (Monorepo)
 * Purpose: NX00-AUTH-003 呼叫登入 API
 * Notes:
 * - UI 使用 account/password（較通用）
 * - 後端使用 username/password（對齊 nx00_user.username）
 * - 本檔案負責映射 account -> username，避免 username: undefined
 */

export type LoginRequest = {
  account: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user?: {
    id: string;
    username?: string;
    display_name?: string | null;
  };
};

/**
 * @CODE nxui_nx00_auth_login_callapi_002
 * 說明：
 * - 呼叫後端登入 API
 * - 依 NEXT_PUBLIC_API_URL 組合 endpoint
 * - 送出時映射 account -> username
 */
export async function callLoginApi(payload: LoginRequest): Promise<LoginResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!baseUrl) {
    throw new Error('[nxui_nx00_auth_login_callapi_002] NEXT_PUBLIC_API_URL is not set');
  }

  const url = `${baseUrl}/auth/login`;

  // @CODE nxui_nx00_auth_login_payload_map_001
  // 說明：將前端 account 欄位映射為後端 username
  const apiPayload = {
    username: payload.account,
    password: payload.password,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(apiPayload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `[nxui_nx00_auth_login_callapi_002] login failed: ${res.status} ${text}`
    );
  }

  return (await res.json()) as LoginResponse;
}

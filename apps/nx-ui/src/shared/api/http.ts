/**
 * File: apps/nx-ui/src/shared/api/http.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-API-003：HTTP Response 工具（統一錯誤訊息抽取）
 *
 * Notes:
 * - 嘗試解析 JSON，再退回 text
 * - 支援 NestJS 常見 error format: { message: string | string[] }
 */

async function readJsonOrText(res: Response): Promise<unknown> {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

/**
 * @CODE nxui_shared_api_extract_error_message_001
 */
export async function extractHttpErrorMessage(res: Response): Promise<string> {
  const payload = await readJsonOrText(res).catch(() => '');

  if (typeof payload === 'string') {
    return payload;
  }

  // NestJS common format
  const maybeMessage = (payload as any)?.message;

  if (Array.isArray(maybeMessage)) {
    return maybeMessage.join(' / ');
  }

  if (typeof maybeMessage === 'string') {
    return maybeMessage;
  }

  try {
    return JSON.stringify(payload);
  } catch {
    return '';
  }
}

/**
 * @CODE nxui_shared_api_assert_ok_001
 * 說明：
 * - 若 res.ok 為 false：丟出 Error（含 code、status、message）
 */
export async function assertOk(res: Response, code: string): Promise<void> {
  if (res.ok) return;

  const msg = await extractHttpErrorMessage(res);
  throw new Error(`[${code}] ${res.status} ${msg || 'Request failed'}`);
}
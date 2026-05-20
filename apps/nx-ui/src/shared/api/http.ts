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
 * - 支援 class-validator ValidationError 物件陣列（commit 70：避免顯示 [object Object]）
 */

async function readJsonOrText(res: Response): Promise<unknown> {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

/**
 * 將 NestJS validation error / 其他 error item 轉成可讀字串。
 * 支援：
 * - string → 直接回傳
 * - class-validator ValidationError: { property, constraints: { rule: msg } } → 取 constraints 的 messages
 * - 其他 object → JSON.stringify fallback
 */
function stringifyErrorItem(item: unknown): string {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') {
    const obj = item as { constraints?: unknown; message?: unknown; property?: unknown };
    // class-validator ValidationError 常見格式：{ property, constraints: { isLength: "...", matches: "..." } }
    if (obj.constraints && typeof obj.constraints === 'object') {
      const msgs = Object.values(obj.constraints as Record<string, unknown>).filter(
        (v): v is string => typeof v === 'string',
      );
      if (msgs.length > 0) {
        const prefix = typeof obj.property === 'string' ? `${obj.property}: ` : '';
        return prefix + msgs.join('、');
      }
    }
    // 巢狀 message
    if (typeof obj.message === 'string') return obj.message;
    try {
      return JSON.stringify(item);
    } catch {
      return String(item);
    }
  }
  return String(item);
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
  const maybeMessage = (payload as { message?: unknown } | null)?.message;

  if (Array.isArray(maybeMessage)) {
    return maybeMessage.map(stringifyErrorItem).join(' / ');
  }

  if (typeof maybeMessage === 'string') {
    return maybeMessage;
  }

  if (maybeMessage && typeof maybeMessage === 'object') {
    return stringifyErrorItem(maybeMessage);
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
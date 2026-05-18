// apps/nx-ui/src/shared/errors/nexora-error.ts
// NEXORA frontend 統一錯誤類型 + helper
//
// 對齊：docs/_team/nexora-error-code-spec.md v1.1 §7.1 §7.3

/**
 * NEXORA 統一錯誤 response 格式（對應 backend NexoraErrorResponse）。
 * 規範 v1.1 §7.1。
 */
export interface NexoraErrorResponse {
  statusCode: number;
  errorCode: string;
  message: string;
  timestamp?: string;
  path?: string;
}

/** 前端用簡化型別（client-side validation + server response 共用）。 */
export interface NexoraClientError {
  errorCode: string;
  message: string;
}

/** XX-NNN 6 字格式 regex（規範 v1.1 §2）。 */
export const NEXORA_ERROR_CODE_REGEX = /^[A-Z]{2}-\d{3}$/;

/**
 * 從未知 error（fetch 失敗 / parse 失敗 / Response.text）解析出 NexoraClientError。
 * 規範 v1.1 §7.5 破壞性 verify：既有 `{ statusCode, message }` 不破壞、加 errorCode 純擴充。
 */
export function toNexoraClientError(err: unknown, fallback: NexoraClientError): NexoraClientError {
  if (!err) return fallback;
  // Already a NexoraClientError
  if (
    typeof err === 'object' &&
    err !== null &&
    'errorCode' in err &&
    'message' in err &&
    typeof (err as NexoraClientError).errorCode === 'string' &&
    NEXORA_ERROR_CODE_REGEX.test((err as NexoraClientError).errorCode)
  ) {
    return {
      errorCode: (err as NexoraClientError).errorCode,
      message: String((err as NexoraClientError).message ?? fallback.message),
    };
  }
  // Error.message 可能含 JSON body（既有 ApiClientError 範式）
  if (err instanceof Error) {
    const parsed = tryParseJsonInString(err.message);
    if (parsed) return parsed;
    return { errorCode: fallback.errorCode, message: err.message || fallback.message };
  }
  if (typeof err === 'string') {
    const parsed = tryParseJsonInString(err);
    if (parsed) return parsed;
    return { errorCode: fallback.errorCode, message: err };
  }
  return fallback;
}

function tryParseJsonInString(raw: string): NexoraClientError | null {
  // 從字串中找第一個 `{` 嘗試 parse 出 NexoraErrorResponse
  const idx = raw.indexOf('{');
  if (idx < 0) return null;
  try {
    const obj = JSON.parse(raw.slice(idx)) as Partial<NexoraErrorResponse>;
    if (
      typeof obj?.errorCode === 'string' &&
      NEXORA_ERROR_CODE_REGEX.test(obj.errorCode) &&
      typeof obj?.message === 'string'
    ) {
      return { errorCode: obj.errorCode, message: obj.message };
    }
    return null;
  } catch {
    return null;
  }
}

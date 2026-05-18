// apps/nx-api/src/shared/errors/nexora-error.ts
// NEXORA 統一錯誤 response 格式 + HttpException helper
//
// 對齊：docs/_team/nexora-error-code-spec.md v1.1 §7.1 §7.2
// 業界改革第 19 候選 ⭐⭐⭐（跨模組統一錯誤代碼制度）

import { HttpException, type HttpStatus } from '@nestjs/common';

/**
 * NEXORA 統一錯誤 response 格式
 * 對齊 NEXORA 錯誤代碼統一規範 v1.1 §7.1
 */
export interface NexoraErrorResponse {
  /** HTTP status (既有 NestJS 預設、如 400/401/403/404)。 */
  statusCode: number;
  /** XX-NNN 錯誤代碼（如 'AU-001'、規範 v1.1 §2 格式）。 */
  errorCode: string;
  /** 使用者看到的中文訊息（既有）。 */
  message: string;
  /** ISO 8601 log trace 用（可選）。 */
  timestamp?: string;
  /** request path（可選、由 filter 帶入）。 */
  path?: string;
}

/**
 * NEXORA 錯誤代碼正規表達式（XX-NNN 6 字格式）。
 * 對齊規範 §2 + §8.2 命名審查。
 */
export const NEXORA_ERROR_CODE_REGEX = /^[A-Z]{2}-\d{3}$/;

/**
 * NEXORA 統一 HttpException helper。
 *
 * 對齊規範 §7.2：response body 含 statusCode + errorCode + message + timestamp。
 *
 * 使用範例：
 *   throw new NexoraHttpException({
 *     statusCode: HttpStatus.UNAUTHORIZED,
 *     errorCode: 'AU-001',
 *     message: '登入失敗、請確認公司帳號、使用者帳號與密碼',
 *   });
 */
export class NexoraHttpException extends HttpException {
  /** 錯誤代碼（grep / log trace 用）。 */
  readonly errorCode: string;

  constructor(payload: Omit<NexoraErrorResponse, 'timestamp' | 'path'> & { errorCode: string }) {
    if (!NEXORA_ERROR_CODE_REGEX.test(payload.errorCode)) {
      throw new Error(
        `[NexoraHttpException] errorCode '${payload.errorCode}' violates規範 §2 XX-NNN 格式`,
      );
    }
    super(
      {
        statusCode: payload.statusCode,
        errorCode: payload.errorCode,
        message: payload.message,
        timestamp: new Date().toISOString(),
      } satisfies NexoraErrorResponse,
      payload.statusCode as HttpStatus,
    );
    this.errorCode = payload.errorCode;
  }
}

// apps/nx-api/src/shared/file-upload/errors/file-upload.errors.ts
// FileUpload 子系統自訂例外 — 對齊 NestJS HttpException 體系。
// caller（軌 3 controller）可直接 throw、global filter 自動轉 HTTP response。

import { BadRequestException, NotFoundException } from '@nestjs/common';

/** 檔案超過大小上限 */
export class FileTooLargeError extends BadRequestException {
  constructor(size: number, maxBytes: number) {
    super({
      code: 'FILE_TOO_LARGE',
      message: `File size ${size} bytes exceeds the limit of ${maxBytes} bytes`,
      size,
      maxBytes,
    });
  }
}

/** MIME 類型不在 allow-list */
export class DisallowedMimeTypeError extends BadRequestException {
  constructor(mimeType: string) {
    super({
      code: 'DISALLOWED_MIME_TYPE',
      message: `MIME type "${mimeType}" is not allowed`,
      mimeType,
    });
  }
}

/** storage_key 格式違規（含 path traversal、缺 tenantId prefix 等） */
export class InvalidStorageKeyError extends BadRequestException {
  constructor(storageKey: string, reason: string) {
    super({
      code: 'INVALID_STORAGE_KEY',
      message: `Invalid storage key "${storageKey}": ${reason}`,
      storageKey,
      reason,
    });
  }
}

/** 嘗試讀取的檔案不存在 */
export class FileNotFoundError extends NotFoundException {
  constructor(storageKey: string) {
    super({
      code: 'FILE_NOT_FOUND',
      message: `File not found at storage key "${storageKey}"`,
      storageKey,
    });
  }
}

/** caller 提供的 tenantId 與 storage_key prefix 不符（防越權跨租戶讀寫） */
export class TenantMismatchError extends BadRequestException {
  constructor(expectedTenantId: string, storageKey: string) {
    super({
      code: 'TENANT_MISMATCH',
      message: `Storage key "${storageKey}" does not belong to tenant "${expectedTenantId}"`,
      expectedTenantId,
      storageKey,
    });
  }
}

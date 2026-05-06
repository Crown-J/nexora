// apps/nx-api/src/shared/file-upload/file-upload.service.ts
// FileUploadService — 高階 API、給 caller（軌 3 controller / 其他模組 service）呼叫。
//
// 職責：
//   1. 驗證 size / mime（依 FileUploadConfig）
//   2. 產 storage_key：`{tenantId}/{module}/{yyyy}/{mm}/{uuid}{ext}`
//   3. 委派 IFileStorage put/get/delete
//   4. tenantId 強制 prefix、防越權跨租戶讀寫
//
// 不負責：
//   - DB 寫入（caller 自己寫子表如 nx01_bulletin_attachment）
//   - HTTP 解 multipart（caller controller 用 multer）
//   - signed URL 簽發（階段 2 R2 補）

import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

import { Inject, Injectable, Logger } from '@nestjs/common';

import { FILE_STORAGE, FILE_UPLOAD_CONFIG } from './constants/file-upload.tokens';
import type { FileUploadConfig } from './config/file-upload.config';
import type { IFileStorage } from './interfaces/file-storage.interface';
import type {
  StoredFileMeta,
  UploadFileInput,
  UploadRequest,
} from './interfaces/upload-input.interface';
import {
  DisallowedMimeTypeError,
  FileTooLargeError,
  InvalidStorageKeyError,
  TenantMismatchError,
} from './errors/file-upload.errors';

const MODULE_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const TENANT_ID_PATTERN = /^[A-Z0-9]{15}$/;

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);

  constructor(
    @Inject(FILE_STORAGE)
    private readonly storage: IFileStorage,
    @Inject(FILE_UPLOAD_CONFIG)
    private readonly config: FileUploadConfig,
  ) {}

  /**
   * 上傳單檔。回傳 storage_key 等 metadata、由 caller 寫入對應子表。
   */
  async upload(req: UploadRequest): Promise<StoredFileMeta> {
    this.assertValidTenantId(req.tenantId);
    this.assertValidModule(req.module);
    this.validateFile(req.file);

    const storageKey = this.generateStorageKey(
      req.tenantId,
      req.module,
      req.file.originalFilename,
    );

    await this.storage.put(storageKey, req.file.buffer, req.file.mimeType);

    this.logger.log(
      `UPLOAD tenant=${req.tenantId} module=${req.module} key=${storageKey} size=${req.file.size}`,
    );

    return {
      storageKey,
      size: req.file.size,
      mimeType: req.file.mimeType,
      origFilename: req.file.originalFilename,
    };
  }

  /**
   * 下載單檔。
   * 強制驗證 storageKey prefix === tenantId、防越權跨租戶讀。
   */
  async download(
    tenantId: string,
    storageKey: string,
  ): Promise<{ buffer: Buffer }> {
    this.assertValidTenantId(tenantId);
    this.assertTenantOwnsKey(tenantId, storageKey);
    const buffer = await this.storage.get(storageKey);
    return { buffer };
  }

  /**
   * 刪除單檔（idempotent — 不存在不報錯）。
   * 強制 tenantId prefix 驗證。
   */
  async remove(tenantId: string, storageKey: string): Promise<void> {
    this.assertValidTenantId(tenantId);
    this.assertTenantOwnsKey(tenantId, storageKey);
    await this.storage.delete(storageKey);
    this.logger.log(`DELETE tenant=${tenantId} key=${storageKey}`);
  }

  /**
   * 產 storage_key。範式跨 backend 通用：
   *   {tenantId}/{module}/{yyyy}/{mm}/{uuid}{ext}
   */
  private generateStorageKey(
    tenantId: string,
    module: string,
    originalFilename: string,
  ): string {
    const now = new Date();
    const yyyy = now.getUTCFullYear().toString();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const ext = path.extname(originalFilename).toLowerCase().slice(0, 16);
    const uuid = randomUUID();
    return `${tenantId}/${module}/${yyyy}/${mm}/${uuid}${ext}`;
  }

  private validateFile(file: UploadFileInput): void {
    if (file.size > this.config.maxBytes) {
      throw new FileTooLargeError(file.size, this.config.maxBytes);
    }
    if (!this.config.allowedMimeTypes.includes(file.mimeType)) {
      throw new DisallowedMimeTypeError(file.mimeType);
    }
  }

  private assertValidTenantId(tenantId: string): void {
    if (!TENANT_ID_PATTERN.test(tenantId)) {
      throw new InvalidStorageKeyError(
        tenantId,
        'tenantId must match VARCHAR(15) ID format',
      );
    }
  }

  private assertValidModule(module: string): void {
    if (!MODULE_NAME_PATTERN.test(module)) {
      throw new InvalidStorageKeyError(
        module,
        'module must be lowercase alphanumeric with hyphens',
      );
    }
  }

  private assertTenantOwnsKey(tenantId: string, storageKey: string): void {
    if (!storageKey.startsWith(`${tenantId}/`)) {
      throw new TenantMismatchError(tenantId, storageKey);
    }
  }
}

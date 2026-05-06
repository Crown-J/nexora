// apps/nx-api/src/shared/file-upload/storage/local-file-storage.ts
// IFileStorage 階段 1 本地檔案系統實作 — 開發 / 測試用 stub。
//
// 注意事項：
//   1. 不適合生產環境（單機磁碟、無冗餘、無 CDN）— 階段 2 接 R2 後本檔退場
//   2. path traversal 防護：解析後絕對路徑必須在 root 之下
//   3. mkdir -p 自動建中間目錄、不要求 caller 預建
//   4. mimeType 參數本實作不使用（純檔案系統、無 metadata 儲存）— 階段 2 R2 會用上

import * as path from 'node:path';
import * as fs from 'node:fs/promises';

import { Inject, Injectable, Logger } from '@nestjs/common';

import { FILE_UPLOAD_CONFIG } from '../constants/file-upload.tokens';
import type { FileUploadConfig } from '../config/file-upload.config';
import type { IFileStorage } from '../interfaces/file-storage.interface';
import {
  FileNotFoundError,
  InvalidStorageKeyError,
} from '../errors/file-upload.errors';

@Injectable()
export class LocalFileStorage implements IFileStorage {
  private readonly logger = new Logger(LocalFileStorage.name);

  constructor(
    @Inject(FILE_UPLOAD_CONFIG)
    private readonly config: FileUploadConfig,
  ) {}

  async put(
    storageKey: string,
    buffer: Buffer,
    _mimeType: string,
  ): Promise<void> {
    const absPath = this.resolveSafePath(storageKey);
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, buffer);
    this.logger.debug(`PUT ${storageKey} (${buffer.length} bytes)`);
  }

  async get(storageKey: string): Promise<Buffer> {
    const absPath = this.resolveSafePath(storageKey);
    try {
      return await fs.readFile(absPath);
    } catch (err: unknown) {
      if (isNodeFsError(err) && err.code === 'ENOENT') {
        throw new FileNotFoundError(storageKey);
      }
      throw err;
    }
  }

  async delete(storageKey: string): Promise<void> {
    const absPath = this.resolveSafePath(storageKey);
    try {
      await fs.unlink(absPath);
      this.logger.debug(`DELETE ${storageKey}`);
    } catch (err: unknown) {
      if (isNodeFsError(err) && err.code === 'ENOENT') {
        return;
      }
      throw err;
    }
  }

  async exists(storageKey: string): Promise<boolean> {
    const absPath = this.resolveSafePath(storageKey);
    try {
      await fs.access(absPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 解析 storageKey 對應的絕對路徑、並驗證在 root 之下（防 path traversal）。
   *
   * 拒絕：
   *   - 絕對路徑（如 /etc/passwd、C:\Windows）
   *   - 含 ".." 的路徑（如 a/../../b）
   *   - 解析後跳出 root 的路徑
   */
  private resolveSafePath(storageKey: string): string {
    if (typeof storageKey !== 'string' || storageKey.length === 0) {
      throw new InvalidStorageKeyError(storageKey, 'must be a non-empty string');
    }
    if (path.isAbsolute(storageKey)) {
      throw new InvalidStorageKeyError(storageKey, 'must be relative');
    }
    if (storageKey.split(/[\\/]/).includes('..')) {
      throw new InvalidStorageKeyError(storageKey, 'must not contain ".."');
    }

    const absPath = path.resolve(this.config.localRoot, storageKey);
    const rootWithSep = this.config.localRoot.endsWith(path.sep)
      ? this.config.localRoot
      : this.config.localRoot + path.sep;
    if (absPath !== this.config.localRoot && !absPath.startsWith(rootWithSep)) {
      throw new InvalidStorageKeyError(
        storageKey,
        'resolved path escapes the storage root',
      );
    }
    return absPath;
  }
}

function isNodeFsError(err: unknown): err is NodeJS.ErrnoException {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string'
  );
}

// apps/nx-api/src/shared/file-upload/__tests__/file-upload.service.spec.ts
// FileUploadService 高階 API 行為驗證 — size/mime 限制 + tenant prefix 強制 + storage_key 範式。

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { FileUploadService } from '../file-upload.service';
import {
  DisallowedMimeTypeError,
  FileTooLargeError,
  InvalidStorageKeyError,
  TenantMismatchError,
} from '../errors/file-upload.errors';
import type { IFileStorage } from '../interfaces/file-storage.interface';
import type { FileUploadConfig } from '../config/file-upload.config';

const VALID_TENANT_ID = 'NX99TANT0000001';

function makeService(overrides: Partial<FileUploadConfig> = {}): {
  service: FileUploadService;
  storage: IFileStorage;
} {
  const config: FileUploadConfig = {
    localRoot: '/tmp/nexora-test',
    maxBytes: 100,
    allowedMimeTypes: ['application/pdf'],
    ...overrides,
  };
  const storage: IFileStorage = {
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(Buffer.from('x')),
    delete: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn().mockResolvedValue(true),
  };
  const service = new FileUploadService(storage, config);
  return { service, storage };
}

describe('FileUploadService', () => {
  describe('upload', () => {
    let service: FileUploadService;
    let storage: IFileStorage;

    beforeEach(() => {
      ({ service, storage } = makeService());
    });

    it('rejects oversize files', async () => {
      await expect(
        service.upload({
          tenantId: VALID_TENANT_ID,
          module: 'nx01-bulletin',
          file: {
            buffer: Buffer.alloc(101),
            originalFilename: 'big.pdf',
            mimeType: 'application/pdf',
            size: 101,
          },
        }),
      ).rejects.toBeInstanceOf(FileTooLargeError);
      expect(storage.put).not.toHaveBeenCalled();
    });

    it('rejects disallowed mime types', async () => {
      await expect(
        service.upload({
          tenantId: VALID_TENANT_ID,
          module: 'nx01-bulletin',
          file: {
            buffer: Buffer.from('x'),
            originalFilename: 'a.exe',
            mimeType: 'application/x-msdownload',
            size: 1,
          },
        }),
      ).rejects.toBeInstanceOf(DisallowedMimeTypeError);
    });

    it('rejects invalid tenantId format', async () => {
      await expect(
        service.upload({
          tenantId: 'not-a-tenant',
          module: 'nx01-bulletin',
          file: {
            buffer: Buffer.from('x'),
            originalFilename: 'a.pdf',
            mimeType: 'application/pdf',
            size: 1,
          },
        }),
      ).rejects.toBeInstanceOf(InvalidStorageKeyError);
    });

    it('rejects invalid module name', async () => {
      await expect(
        service.upload({
          tenantId: VALID_TENANT_ID,
          module: 'NX01-Bulletin', // uppercase 不允許
          file: {
            buffer: Buffer.from('x'),
            originalFilename: 'a.pdf',
            mimeType: 'application/pdf',
            size: 1,
          },
        }),
      ).rejects.toBeInstanceOf(InvalidStorageKeyError);
    });

    it('produces storage_key with tenant/module/yyyy/mm prefix', async () => {
      const meta = await service.upload({
        tenantId: VALID_TENANT_ID,
        module: 'nx01-bulletin',
        file: {
          buffer: Buffer.from('x'),
          originalFilename: 'memo.pdf',
          mimeType: 'application/pdf',
          size: 1,
        },
      });
      expect(meta.storageKey).toMatch(
        new RegExp(
          `^${VALID_TENANT_ID}/nx01-bulletin/\\d{4}/\\d{2}/[0-9a-f-]{36}\\.pdf$`,
        ),
      );
      expect(meta.size).toBe(1);
      expect(meta.mimeType).toBe('application/pdf');
      expect(meta.origFilename).toBe('memo.pdf');
      expect(storage.put).toHaveBeenCalledTimes(1);
    });

    it('preserves uppercase extension as lowercase in key', async () => {
      const meta = await service.upload({
        tenantId: VALID_TENANT_ID,
        module: 'nx01-bulletin',
        file: {
          buffer: Buffer.from('x'),
          originalFilename: 'UPPER.PDF',
          mimeType: 'application/pdf',
          size: 1,
        },
      });
      expect(meta.storageKey.endsWith('.pdf')).toBe(true);
    });
  });

  describe('download', () => {
    it('rejects when storageKey does not start with tenantId', async () => {
      const { service } = makeService();
      await expect(
        service.download(VALID_TENANT_ID, 'NX99TANT9999999/x/y.pdf'),
      ).rejects.toBeInstanceOf(TenantMismatchError);
    });

    it('returns buffer when prefix matches', async () => {
      const { service } = makeService();
      const result = await service.download(
        VALID_TENANT_ID,
        `${VALID_TENANT_ID}/nx01-bulletin/2026/05/x.pdf`,
      );
      expect(result.buffer.toString()).toBe('x');
    });
  });

  describe('remove', () => {
    it('rejects cross-tenant deletion', async () => {
      const { service } = makeService();
      await expect(
        service.remove(VALID_TENANT_ID, 'NX99TANT9999999/x/y.pdf'),
      ).rejects.toBeInstanceOf(TenantMismatchError);
    });

    it('delegates to storage.delete', async () => {
      const { service, storage } = makeService();
      await service.remove(
        VALID_TENANT_ID,
        `${VALID_TENANT_ID}/nx01-bulletin/2026/05/x.pdf`,
      );
      expect(storage.delete).toHaveBeenCalledTimes(1);
    });
  });
});

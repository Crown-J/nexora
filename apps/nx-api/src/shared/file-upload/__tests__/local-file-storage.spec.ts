// apps/nx-api/src/shared/file-upload/__tests__/local-file-storage.spec.ts
// LocalFileStorage 階段 1 stub 行為驗證 — put/get/delete/exists + path traversal 防護。

import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs/promises';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { LocalFileStorage } from '../storage/local-file-storage';
import {
  FileNotFoundError,
  InvalidStorageKeyError,
} from '../errors/file-upload.errors';
import type { FileUploadConfig } from '../config/file-upload.config';

function makeStorage(localRoot: string): LocalFileStorage {
  const config: FileUploadConfig = {
    localRoot,
    maxBytes: 1024 * 1024,
    allowedMimeTypes: ['application/pdf', 'image/png'],
  };
  return new LocalFileStorage(config);
}

describe('LocalFileStorage', () => {
  let tmpRoot: string;
  let storage: LocalFileStorage;

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'nexora-upload-test-'));
    storage = makeStorage(tmpRoot);
  });

  afterEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  describe('put / get', () => {
    it('writes and reads back identical bytes', async () => {
      const key = 'NX99TANT0000001/test/2026/05/abc.pdf';
      const payload = Buffer.from('hello nexora');
      await storage.put(key, payload, 'application/pdf');
      const out = await storage.get(key);
      expect(out.equals(payload)).toBe(true);
    });

    it('auto-creates intermediate directories', async () => {
      const key = 'NX99TANT0000001/deep/path/2026/05/file.pdf';
      await storage.put(key, Buffer.from('x'), 'application/pdf');
      const stat = await fs.stat(path.join(tmpRoot, key));
      expect(stat.isFile()).toBe(true);
    });

    it('overwrites when same key is put twice', async () => {
      const key = 'NX99TANT0000001/test/2026/05/file.pdf';
      await storage.put(key, Buffer.from('first'), 'application/pdf');
      await storage.put(key, Buffer.from('second'), 'application/pdf');
      expect((await storage.get(key)).toString()).toBe('second');
    });
  });

  describe('get on missing file', () => {
    it('throws FileNotFoundError', async () => {
      await expect(
        storage.get('NX99TANT0000001/test/2026/05/missing.pdf'),
      ).rejects.toBeInstanceOf(FileNotFoundError);
    });
  });

  describe('delete', () => {
    it('removes existing file', async () => {
      const key = 'NX99TANT0000001/test/2026/05/del.pdf';
      await storage.put(key, Buffer.from('x'), 'application/pdf');
      await storage.delete(key);
      expect(await storage.exists(key)).toBe(false);
    });

    it('is idempotent on missing file', async () => {
      await expect(
        storage.delete('NX99TANT0000001/test/missing.pdf'),
      ).resolves.toBeUndefined();
    });
  });

  describe('exists', () => {
    it('returns true after put', async () => {
      const key = 'NX99TANT0000001/test/exists.pdf';
      await storage.put(key, Buffer.from('x'), 'application/pdf');
      expect(await storage.exists(key)).toBe(true);
    });

    it('returns false for never-written key', async () => {
      expect(await storage.exists('NX99TANT0000001/test/never.pdf')).toBe(
        false,
      );
    });
  });

  describe('path traversal防護', () => {
    it('rejects absolute paths', async () => {
      await expect(
        storage.put('/etc/passwd', Buffer.from('x'), 'application/pdf'),
      ).rejects.toBeInstanceOf(InvalidStorageKeyError);
    });

    it('rejects ".." segments', async () => {
      await expect(
        storage.put(
          'NX99TANT0000001/../../../etc/passwd',
          Buffer.from('x'),
          'application/pdf',
        ),
      ).rejects.toBeInstanceOf(InvalidStorageKeyError);
    });

    it('rejects empty key', async () => {
      await expect(
        storage.put('', Buffer.from('x'), 'application/pdf'),
      ).rejects.toBeInstanceOf(InvalidStorageKeyError);
    });
  });
});

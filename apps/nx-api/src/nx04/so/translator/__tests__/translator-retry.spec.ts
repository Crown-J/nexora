// apps/nx-api/src/nx04/so/translator/__tests__/translator-retry.spec.ts
// 意圖 §3.4：捕捉 P2034/40P01/55P03 → 3 次 exponential backoff retry → 最後失敗回 TranslatorBusyError
import { describe, expect, it, vi } from 'vitest';

import { Nx04SoTranslatorService } from '../translator.service';
import {
  TranslatorBusyError,
  TranslatorInvalidInputError,
  TranslatorSystemError,
} from '../translator-error';

// 用 stub instances 建 service（不依賴 NestJS DI，直接 new）
function makeService(): Nx04SoTranslatorService {
  return new Nx04SoTranslatorService(
    {} as unknown as never, // prisma not used in retry path tests
    {} as unknown as never,
    {} as unknown as never,
  );
}

describe('Translator retry — intent §3.4', () => {
  it('returns result on first attempt when no error', async () => {
    const svc = makeService();
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await svc.runWithRetry(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on Prisma serialization (P2034) and succeeds on 2nd attempt', async () => {
    const svc = makeService();
    const err = Object.assign(new Error('serialization'), { code: 'P2034' });
    const fn = vi.fn().mockRejectedValueOnce(err).mockResolvedValueOnce('ok');
    const result = await svc.runWithRetry(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on PostgreSQL deadlock (40P01)', async () => {
    const svc = makeService();
    const err = Object.assign(new Error('deadlock'), { code: '40P01' });
    const fn = vi.fn().mockRejectedValueOnce(err).mockResolvedValueOnce('ok');
    const result = await svc.runWithRetry(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on lock timeout (55P03)', async () => {
    const svc = makeService();
    const err = Object.assign(new Error('lock_timeout'), { code: '55P03' });
    const fn = vi.fn().mockRejectedValueOnce(err).mockResolvedValueOnce('ok');
    const result = await svc.runWithRetry(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws TranslatorBusyError after 3 failed retries', async () => {
    const svc = makeService();
    const err = Object.assign(new Error('deadlock'), { code: '40P01' });
    const fn = vi.fn().mockRejectedValue(err);
    await expect(svc.runWithRetry(fn)).rejects.toBeInstanceOf(TranslatorBusyError);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does NOT retry on non-retryable error', async () => {
    const svc = makeService();
    const err = new TranslatorInvalidInputError('PART_NOT_IN_TENANT', '料號不屬於租戶');
    const fn = vi.fn().mockRejectedValue(err);
    await expect(svc.runWithRetry(fn)).rejects.toBeInstanceOf(TranslatorInvalidInputError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('wraps unknown Error into TranslatorSystemError', async () => {
    const svc = makeService();
    const err = new Error('DB connection lost');
    const fn = vi.fn().mockRejectedValue(err);
    await expect(svc.runWithRetry(fn)).rejects.toBeInstanceOf(TranslatorSystemError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('uses exponential backoff (50/200/800ms total ≥ 1050ms after 3 failures)', async () => {
    const svc = makeService();
    const err = Object.assign(new Error('lock_timeout'), { code: '55P03' });
    const fn = vi.fn().mockRejectedValue(err);

    const t0 = Date.now();
    await expect(svc.runWithRetry(fn)).rejects.toBeInstanceOf(TranslatorBusyError);
    const elapsed = Date.now() - t0;
    // 50 + 200 + 800 = 1050 (sleep between attempts) — 允許 50ms buffer
    expect(elapsed).toBeGreaterThanOrEqual(1000);
  });
});

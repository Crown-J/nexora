// apps/nx-api/src/nx04/so/translator/__tests__/translator-tx-atomic.spec.ts
// 意圖 §3.1：單一 transaction 完成所有寫入，禁止半成品狀態。
// 單元層次：驗證 InvalidInput 不會 trigger retry（避免「半成品+retry=雙寫」風險），
//   讓 translator 在輸入錯誤時直接讓 transaction 拋錯結束 → Prisma 自動 ROLLBACK。
// 真實「中途失敗整段 ROLLBACK」由整合測試（int-spec）驗證。
import { describe, expect, it, vi } from 'vitest';

import { Nx04SoTranslatorService } from '../translator.service';
import {
  TranslatorBusyError,
  TranslatorInvalidInputError,
  TranslatorSystemError,
} from '../translator-error';

function makeService(): Nx04SoTranslatorService {
  return new Nx04SoTranslatorService(
    {} as unknown as never,
    {} as unknown as never,
    {} as unknown as never,
  );
}

describe('Translator tx atomicity (intent §3.1)', () => {
  it('input error stops immediately — no retry, no half-committed state', async () => {
    const svc = makeService();
    const inputErr = new TranslatorInvalidInputError(
      'PART_NOT_IN_TENANT',
      '料號不屬於租戶',
    );
    const fn = vi.fn().mockRejectedValue(inputErr);

    // runWithRetry should immediately rethrow input errors (no retry loop)
    await expect(svc.runWithRetry(fn)).rejects.toBeInstanceOf(TranslatorInvalidInputError);
    expect(fn).toHaveBeenCalledTimes(1); // critical: no retry
  });

  it('系統錯誤（DB 斷）→ TranslatorSystemError，不 retry', async () => {
    const svc = makeService();
    const dbDownErr = new Error('connection terminated');
    const fn = vi.fn().mockRejectedValue(dbDownErr);

    await expect(svc.runWithRetry(fn)).rejects.toBeInstanceOf(TranslatorSystemError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('並發失敗（deadlock）→ retry 過後仍失敗 → TranslatorBusyError，不洩漏 PostgreSQL errno', async () => {
    const svc = makeService();
    const deadlockErr = Object.assign(new Error('deadlock detected'), { code: '40P01' });
    const fn = vi.fn().mockRejectedValue(deadlockErr);

    await expect(svc.runWithRetry(fn)).rejects.toBeInstanceOf(TranslatorBusyError);
    // 業務看到的 message 不含 '40P01' 也不含 'deadlock detected'（這是技術細節）
    try {
      await svc.runWithRetry(fn);
    } catch (e) {
      const err = e as TranslatorBusyError;
      expect(err.userMessage).not.toContain('40P01');
      expect(err.userMessage).not.toContain('deadlock');
      expect(err.userMessage).toBe('系統忙碌，請稍後再試');
    }
  });

  it('translator 對輸入錯誤不重啟 transaction（避免雙寫）', async () => {
    const svc = makeService();
    let attemptCount = 0;
    const fn = vi.fn().mockImplementation(async () => {
      attemptCount++;
      throw new TranslatorInvalidInputError(
        'CUSTOMER_NOT_C_PARTNER',
        '客戶不存在',
      );
    });

    await expect(svc.runWithRetry(fn)).rejects.toBeInstanceOf(TranslatorInvalidInputError);
    expect(attemptCount).toBe(1); // 確認沒重複跑（不會建兩張 SO）
  });
});

// apps/nx-api/src/__tests__/sanity.spec.ts
// 確認 vitest 框架本身跑得起來（不依賴任何 NestJS / Prisma 載入）。
// 真實 D4 translator 測試在 src/nx04/so/translator/__tests__/ 下。
import { describe, it, expect } from 'vitest';

describe('vitest sanity', () => {
  it('can run a basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  it('supports async assertions', async () => {
    const result = await Promise.resolve('ok');
    expect(result).toBe('ok');
  });
});

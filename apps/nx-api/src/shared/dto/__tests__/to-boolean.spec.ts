// apps/nx-api/src/shared/dto/__tests__/to-boolean.spec.ts
// toBoolean transform spec：驗證在 enableImplicitConversion:true（全域 ValidationPipe 同款設定）下,
// @Transform(toBoolean) 收到的是原始字串、'false' 不會被隱式 Boolean('false')=true 搶轉。
// 背景：2026-06-03 走查已在 Nx01ListQueryDto 修過同款坑（pagination-isactive.spec.ts）;
// 2026-07-21 垃圾桶回饋後全庫 DTO 掃掉 @Type(() => Boolean)、本 spec 守住散落 DTO 的行為。
import 'reflect-metadata';

import { plainToInstance, Transform } from 'class-transformer';
import { IsBoolean, IsOptional, validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';

import { toBoolean } from '../to-boolean';

class SampleQueryDto {
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;
}

function parseQuery(raw: Record<string, unknown>): SampleQueryDto {
  const dto = plainToInstance(SampleQueryDto, raw, { enableImplicitConversion: true });
  const errors = validateSync(dto, { whitelist: true });
  if (errors.length > 0) {
    throw new Error(`validation failed: ${JSON.stringify(errors[0]?.constraints)}`);
  }
  return dto;
}

describe('toBoolean — @Type(() => Boolean) 地雷的全庫替代寫法', () => {
  it("字串 'false' → false（舊寫法會錯轉 true）", () => {
    expect(parseQuery({ isActive: 'false' }).isActive).toBe(false);
  });

  it("字串 'true' → true", () => {
    expect(parseQuery({ isActive: 'true' }).isActive).toBe(true);
  });

  it("字串 '0' → false、'1' → true（對齊六月 toOptionalBool 語意）", () => {
    expect(parseQuery({ isActive: '0' }).isActive).toBe(false);
    expect(parseQuery({ isActive: '1' }).isActive).toBe(true);
  });

  it('boolean 直送原樣通過（body DTO 不受影響）', () => {
    expect(parseQuery({ isActive: true }).isActive).toBe(true);
    expect(parseQuery({ isActive: false }).isActive).toBe(false);
  });

  it('未帶 → undefined', () => {
    expect(parseQuery({}).isActive).toBeUndefined();
  });

  it('垃圾值被 IsBoolean 擋下', () => {
    expect(() => parseQuery({ isActive: 'banana' })).toThrow();
  });
});

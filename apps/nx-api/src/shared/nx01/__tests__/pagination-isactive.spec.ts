// apps/nx-api/src/shared/nx01/__tests__/pagination-isactive.spec.ts
// Nx01ListQueryDto.isActive 解析 spec — 重現 + 證實 bug 修法
//
// Crown 走查 2026-06-03 真因：
//   - 精靈 fetchPendingEmployees 打 `/nx01/users?isActive=false&pageSize=100`
//   - 後端 @Type(() => Boolean) 把字串 'false' 透過 Boolean('false') = true 錯轉
//   - 結果撈到 isActive=true 的負責人（1 筆）、不是匯入的 161 筆 inactive 員工
//
// 修法：改用 @Transform 顯式處理 'false'/'true'/'0'/'1'/boolean、空值 undefined

import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';

import { Nx01ListQueryDto } from '../pagination.dto';

function parseQuery(raw: Record<string, unknown>): Nx01ListQueryDto {
  const dto = plainToInstance(Nx01ListQueryDto, raw, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(dto, { whitelist: true });
  if (errors.length > 0) {
    throw new Error(`validation failed: ${JSON.stringify(errors[0]?.constraints)}`);
  }
  return dto;
}

describe('Nx01ListQueryDto.isActive — Crown 2026-06-03 走查 bug 修正', () => {
  it('字串 "false" → false（修正前是 true、本 spec 守住不退）', () => {
    const dto = parseQuery({ isActive: 'false' });
    expect(dto.isActive).toBe(false);
  });

  it('字串 "true" → true', () => {
    const dto = parseQuery({ isActive: 'true' });
    expect(dto.isActive).toBe(true);
  });

  it('字串 "0" → false', () => {
    const dto = parseQuery({ isActive: '0' });
    expect(dto.isActive).toBe(false);
  });

  it('字串 "1" → true', () => {
    const dto = parseQuery({ isActive: '1' });
    expect(dto.isActive).toBe(true);
  });

  it('boolean true → true（向下相容、避免影響非 query 來源）', () => {
    const dto = parseQuery({ isActive: true });
    expect(dto.isActive).toBe(true);
  });

  it('boolean false → false', () => {
    const dto = parseQuery({ isActive: false });
    expect(dto.isActive).toBe(false);
  });

  it('未傳 → undefined', () => {
    const dto = parseQuery({});
    expect(dto.isActive).toBeUndefined();
  });

  it('空字串 → undefined（query 出現 isActive=&page=1 等）', () => {
    const dto = parseQuery({ isActive: '' });
    expect(dto.isActive).toBeUndefined();
  });
});

describe('Nx01ListQueryDto 其他欄位 transform 不受影響', () => {
  it('pageSize=100 → 100', () => {
    const dto = parseQuery({ pageSize: '100' });
    expect(dto.pageSize).toBe(100);
  });

  it('search 字串保留', () => {
    const dto = parseQuery({ search: 'wang' });
    expect(dto.search).toBe('wang');
  });
});

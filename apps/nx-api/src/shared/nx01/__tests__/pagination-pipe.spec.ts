// apps/nx-api/src/shared/nx01/__tests__/pagination-pipe.spec.ts
// 用真實 ValidationPipe 重現 bug-04 真因：transformOptions.enableImplicitConversion
// 在 @Transform 之後做 native Boolean() coercion、把 'false' 偷襲成 true。

import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { Nx01ListQueryDto } from '../pagination.dto';
import { ListUserQueryDto } from '../../../nx01/user/dto/user.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: false,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

async function runPipe(raw: Record<string, unknown>): Promise<Nx01ListQueryDto> {
  return (await pipe.transform(raw, {
    type: 'query',
    metatype: Nx01ListQueryDto,
  })) as Nx01ListQueryDto;
}

describe('ValidationPipe + Nx01ListQueryDto.isActive（重現 + 守住）', () => {
  it('字串 "false" → false（真實 ValidationPipe 行為）', async () => {
    const dto = await runPipe({ isActive: 'false' });
    expect(dto.isActive).toBe(false);
  });

  it('字串 "true" → true', async () => {
    const dto = await runPipe({ isActive: 'true' });
    expect(dto.isActive).toBe(true);
  });

  it('boolean true → true', async () => {
    const dto = await runPipe({ isActive: true });
    expect(dto.isActive).toBe(true);
  });

  it('未傳 → undefined', async () => {
    const dto = await runPipe({});
    expect(dto.isActive).toBeUndefined();
  });

  it('pageSize="100" → 100', async () => {
    const dto = await runPipe({ pageSize: '100' });
    expect(dto.pageSize).toBe(100);
  });
});

// 重現 controller 實際用的子類 metatype（real-world 流程）
async function runPipeUser(raw: Record<string, unknown>): Promise<ListUserQueryDto> {
  return (await pipe.transform(raw, {
    type: 'query',
    metatype: ListUserQueryDto,
  })) as ListUserQueryDto;
}

describe('ValidationPipe + ListUserQueryDto（子類繼承後 @Transform 還生效嗎）', () => {
  it('字串 "false" → false（與基類預期一致）', async () => {
    const dto = await runPipeUser({ isActive: 'false' });
    expect(dto.isActive).toBe(false);
  });

  it('字串 "true" → true', async () => {
    const dto = await runPipeUser({ isActive: 'true' });
    expect(dto.isActive).toBe(true);
  });

  it('未傳 → undefined', async () => {
    const dto = await runPipeUser({});
    expect(dto.isActive).toBeUndefined();
  });
});


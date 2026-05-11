// apps/nx-api/src/nx02/qt/__tests__/test-mocks.ts
// B5 unit test 共用 mock：prisma transaction client + audit log writer。

import { Logger } from '@nestjs/common';
import { vi } from 'vitest';

import { Nx02QtService } from '../qt.service';

export function createMockTx() {
  return {
    nx02Rfq: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    nx02Qt: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      groupBy: vi.fn(),
    },
    nx02RfqItem: {
      findFirst: vi.fn(),
    },
    nx02Ti: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    nx02TiItem: {
      create: vi.fn(),
    },
    nx01Partner: {
      findFirst: vi.fn(),
    },
    nx01Warehouse: {
      findFirst: vi.fn(),
    },
    nx01Currency: {
      findFirst: vi.fn(),
    },
    nx04SoItem: {
      update: vi.fn(),
    },
    $executeRawUnsafe: vi.fn(),
    $executeRaw: vi.fn(),
  };
}

export type MockTx = ReturnType<typeof createMockTx>;

export function makeService() {
  const tx = createMockTx();
  const prisma = {
    ...tx,
    $transaction: vi.fn().mockImplementation(async (cb: (tx: MockTx) => unknown) => cb(tx)),
  };
  const audit = { write: vi.fn().mockResolvedValue(undefined) };
  const svc = new Nx02QtService(prisma as unknown as never, audit as unknown as never);
  // 安撫 NestJS Logger 的 nested logger（vitest console capture）
  Reflect.set(svc, 'logger', new Logger(Nx02QtService.name));
  return { svc, prisma, tx, audit };
}

export const fakeUser = {
  sub: 'NX01USER0000001',
  username: 'sysadmin',
  roles: ['SYSADMIN'],
  tenantId: 'NX99TENT0000001',
  tenantCode: 'TEST',
  planCode: 'LITE',
} as never;

export const fakeRfq = (overrides: Record<string, unknown> = {}) => ({
  id: 'NX02RFHT0000001',
  tenantId: 'NX99TENT0000001',
  docNo: 'RF-202604-Z01-00001',
  rfqDate: new Date('2026-04-27'),
  warehouseId: 'NX01WHHD0000001',
  supplierId: 'NX01PRTN0000010',
  status: 'DRAFT',
  rfqType: 'P',
  rfqReason: 'T',
  currency: 'TWD',
  sourceSoItemId: 'NX04SOIT0000001',
  voidedAt: null,
  createdAt: new Date('2026-04-27'),
  ...overrides,
});

export const fakeQt = (overrides: Record<string, unknown> = {}) => ({
  id: 'NX02QTHD0000001',
  tenantId: 'NX99TENT0000001',
  rfqId: 'NX02RFHT0000001',
  inquiryPartnerId: 'NX01PRTN0000020',
  quotedPrice: { toString: () => '800', mul: () => ({ toDecimalPlaces: () => ({ toString: () => '4000' }) }) },
  quotedQuantity: { toString: () => '5', mul: () => ({ toDecimalPlaces: () => ({ toString: () => '4000' }) }) },
  leadDays: 3,
  status: 'P',
  notes: null,
  rejectReason: null,
  createdAt: new Date('2026-04-27'),
  createdBy: 'NX01USER0000001',
  updatedAt: new Date('2026-04-27'),
  updatedBy: 'NX01USER0000001',
  ...overrides,
});

// apps/nx-api/src/nx03/stock-reservation/__tests__/test-mocks.ts
// B2 unit test 共用 mock：prisma client + service factory + 假資料

import { vi } from 'vitest';

import { Nx03StockReservationService } from '../stock-reservation.service';

export function createMockPrisma() {
  return {
    nx03StockBalance: {
      findFirst: vi.fn(),
    },
    nx04SoItem: {
      findMany: vi.fn(),
    },
    nx01User: {
      findMany: vi.fn(),
    },
  };
}

export function makeService() {
  const prisma = createMockPrisma();
  const svc = new Nx03StockReservationService(prisma as unknown as never);
  return { svc, prisma };
}

export const fakeUser = {
  sub: 'NX01USER0000001',
  username: 'sysadmin',
  roles: ['SYSADMIN'],
  tenantId: 'NX99TENT0000001',
  tenantCode: 'TEST',
  planCode: 'LITE',
} as never;

const decimal = (v: string) => ({
  toString: () => v,
});

export function fakeSoItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'NX04SOIT0000001',
    soId: 'NX04SOHD0000001',
    partId: 'NX01PART0000001',
    warehouseId: 'NX01WHHD0000001',
    qty: decimal('5'),
    transferSourceType: 'S',
    transferStatus: 'C',
    fulfillStatus: 'W',
    stId: null,
    tiId: null,
    coId: null,
    so: {
      id: 'NX04SOHD0000001',
      docNo: 'SO-202604-Z01-00001',
      soDate: new Date('2026-04-25'),
      status: 'CONFIRMED',
      expectedDeliveryDate: new Date('2026-05-01'),
      createdBy: 'NX01USER0000010',
      customer: { id: 'NX01PRTN0000001', name: '測試客戶 ABC' },
    },
    st: null,
    ti: null,
    co: null,
    rev_Nx02Rfq_sourceSoItemId: [],
    ...overrides,
  };
}

export function fakeStRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'NX03STHD0000001',
    docNo: 'ST-202604-Z01-00001',
    status: 'TRANSIT',
    stDate: new Date('2026-04-26'),
    postedAt: new Date('2026-04-26'),
    receivedAt: null,
    fromWarehouse: { id: 'NX01WHHD0000002', code: 'BW2', name: '北倉 B' },
    toWarehouse: { id: 'NX01WHHD0000001', code: 'MW1', name: '主倉' },
    ...overrides,
  };
}

export function fakeTiRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'NX02TIHT0000001',
    docNo: 'TI-202604-Z01-00001',
    status: 'D',
    tiDate: new Date('2026-04-26'),
    subtotal: decimal('4000'),
    partner: { id: 'NX01PRTN0000020', name: '同行 D-O104' },
    ...overrides,
  };
}

export function fakeCoRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'NX04COHD0000001',
    docNo: 'CO-202604-Z01-00001',
    status: 'P',
    coDate: new Date('2026-04-26'),
    expectedFulfillDate: new Date('2026-05-05'),
    customer: { id: 'NX01PRTN0000001', name: '測試客戶 ABC' },
    ...overrides,
  };
}

export function fakeRfqRow(overrides: { qts?: Array<{ inquiryPartnerId: string; status: string }> } & Record<string, unknown> = {}) {
  const { qts = [], ...rest } = overrides;
  return {
    id: 'NX02RFHT0000001',
    docNo: 'RF-202604-Z01-00001',
    status: 'REPLIED',
    rev_Nx02Qt_rfqId: qts,
    ...rest,
  };
}

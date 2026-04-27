// apps/nx-api/src/nx03/stock-reservation/__tests__/stock-summary.spec.ts
// 意圖 v1.1 §3.1 / §5.1：庫存總覽直接讀 stock_balance

import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { fakeUser, makeService } from './test-mocks';

describe('getStockSummary — intent v1.1 §3.1', () => {
  it('returns physical/reserved/available + part/warehouse meta from stock_balance', async () => {
    const { svc, prisma } = makeService();
    prisma.nx03StockBalance.findFirst.mockResolvedValue({
      id: 'NX03STBL0000001',
      partId: 'NX01PART0000001',
      warehouseId: 'NX01WHHD0000001',
      onHandQty: { toString: () => '50' },
      reservedQty: { toString: () => '30' },
      availableQty: { toString: () => '20' },
      inTransitQty: { toString: () => '0' },
      avgCost: { toString: () => '800' },
      stockValue: { toString: () => '40000' },
      lastInAt: new Date('2026-04-20'),
      lastOutAt: new Date('2026-04-26'),
      lastMoveAt: new Date('2026-04-26'),
      part: { code: 'P-001', name: '料號 P-001' },
      warehouse: { code: 'MW1', name: '主倉' },
    });

    const result = await svc.getStockSummary(fakeUser, 'NX01PART0000001', 'NX01WHHD0000001');

    expect(prisma.nx03StockBalance.findFirst).toHaveBeenCalledWith({
      where: {
        tenantId: 'NX99TENT0000001',
        partId: 'NX01PART0000001',
        warehouseId: 'NX01WHHD0000001',
      },
      select: expect.any(Object),
    });
    expect(result.onHandQty.toString()).toBe('50');
    expect(result.reservedQty.toString()).toBe('30');
    expect(result.availableQty.toString()).toBe('20');
    expect(result.part.code).toBe('P-001');
  });

  it('throws NotFoundException when stock_balance row not exists', async () => {
    const { svc, prisma } = makeService();
    prisma.nx03StockBalance.findFirst.mockResolvedValue(null);

    await expect(
      svc.getStockSummary(fakeUser, 'NX01PART0000099', 'NX01WHHD0000099'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

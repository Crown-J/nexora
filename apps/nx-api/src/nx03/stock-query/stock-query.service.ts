// apps/nx-api/src/nx03/stock-query/stock-query.service.ts
// NX03-STOCK-LITE M2-E：庫存查詢三維度 aggregate（料號 / 庫位 / 倉庫）
//
// 對應 Crown 2026-05-28 拍板 B 方案 C：庫位維度純從 ledger aggregate、不改 balance schema。
//   - balance 維度 = (tenant, part, warehouse) only、沒有 location 拆解
//   - 但 ledger 有 location 維度（每筆異動都記 locationId）
//   - 故 per-location onHandQty = SUM(qtyIn) - SUM(qtyOut) WHERE tenant+part+warehouse+location
//   - per-location avgCost ≡ per-warehouse avgCost（balance 拍板：同倉同料同成本）
//
// 三 endpoint：
//   - byPart(partId)：1 料號 × N 倉庫 × M 庫位 的擺放分布
//   - byLocation(locationId)：1 庫位 × N 料號 的存放清單
//   - byWarehouse(warehouseId)：1 倉庫 × N 料號（含 KPI summary）

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

@Injectable()
export class StockQueryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 料號維度：1 partId × N warehouse × M location
   * 回傳：{ part: {...}, warehouses: [{warehouseId, code, name, onHandQty, avgCost, locations: [{locationId, code, onHandQty}]}] }
   */
  async byPart(user: RequestUser, partId: string) {
    const tenantId = requireTenantId(user);
    const part = await this.prisma.nx01Part.findFirst({
      where: { id: partId, tenantId },
      select: { id: true, code: true, name: true },
    });
    if (!part) throw new NotFoundException('Part not found');

    const balances = await this.prisma.nx03StockBalance.findMany({
      where: { tenantId, partId },
      select: {
        warehouseId: true,
        onHandQty: true,
        reservedQty: true,
        availableQty: true,
        avgCost: true,
        stockValue: true,
        lastMoveAt: true,
        warehouse: { select: { code: true, name: true, isActive: true } },
      },
      orderBy: { warehouseId: 'asc' },
    });

    // 對每個 warehouse 再聚合 ledger 取 per-location onHandQty
    const warehouses = await Promise.all(
      balances.map(async (b) => {
        const ledgerRows = await this.prisma.nx03StockLedger.groupBy({
          by: ['locationId'],
          where: { tenantId, partId, warehouseId: b.warehouseId },
          _sum: { qtyIn: true, qtyOut: true },
        });
        const locations = await Promise.all(
          ledgerRows.map(async (r) => {
            const qIn = new PrismaNs.Decimal(r._sum.qtyIn ?? 0);
            const qOut = new PrismaNs.Decimal(r._sum.qtyOut ?? 0);
            const onHand = qIn.sub(qOut);
            const loc = await this.prisma.nx01Location.findFirst({
              where: { id: r.locationId, tenantId },
              select: { id: true, code: true, name: true, zone: true, isActive: true },
            });
            return {
              locationId: r.locationId,
              locationCode: loc?.code ?? null,
              locationName: loc?.name ?? null,
              zone: loc?.zone ?? null,
              isActive: loc?.isActive ?? false,
              onHandQty: onHand.toString(),
            };
          }),
        );
        // 只回 onHand > 0 的庫位（節省 UI 雜訊；歷史 0 留 ledger 查得到）
        const activeLocations = locations.filter((l) => new PrismaNs.Decimal(l.onHandQty).gt(0));
        return {
          warehouseId: b.warehouseId,
          warehouseCode: b.warehouse?.code ?? null,
          warehouseName: b.warehouse?.name ?? null,
          warehouseActive: b.warehouse?.isActive ?? false,
          onHandQty: b.onHandQty.toString(),
          reservedQty: b.reservedQty.toString(),
          availableQty: b.availableQty.toString(),
          avgCost: b.avgCost.toString(),
          stockValue: b.stockValue.toString(),
          lastMoveAt: b.lastMoveAt,
          locations: activeLocations,
        };
      }),
    );

    return { part, warehouses };
  }

  /**
   * 庫位維度：1 locationId × N part
   * 純從 ledger aggregate per part、回 onHand > 0 的料號
   * avgCost 從 balance 查（per-warehouse 共用、locationId 不影響成本）
   */
  async byLocation(user: RequestUser, locationId: string) {
    const tenantId = requireTenantId(user);
    const location = await this.prisma.nx01Location.findFirst({
      where: { id: locationId, tenantId },
      select: {
        id: true,
        code: true,
        name: true,
        zone: true,
        warehouseId: true,
        isActive: true,
        warehouse: { select: { code: true, name: true } },
      },
    });
    if (!location) throw new NotFoundException('Location not found');

    const ledgerRows = await this.prisma.nx03StockLedger.groupBy({
      by: ['partId'],
      where: { tenantId, locationId },
      _sum: { qtyIn: true, qtyOut: true },
      _max: { movementDate: true },
    });

    const items = await Promise.all(
      ledgerRows.map(async (r) => {
        const qIn = new PrismaNs.Decimal(r._sum.qtyIn ?? 0);
        const qOut = new PrismaNs.Decimal(r._sum.qtyOut ?? 0);
        const onHand = qIn.sub(qOut);
        const part = await this.prisma.nx01Part.findFirst({
          where: { id: r.partId, tenantId },
          select: { id: true, code: true, name: true },
        });
        const bal = await this.prisma.nx03StockBalance.findFirst({
          where: { tenantId, partId: r.partId, warehouseId: location.warehouseId },
          select: { avgCost: true },
        });
        return {
          partId: r.partId,
          partNo: part?.code ?? null,
          partName: part?.name ?? null,
          onHandQty: onHand.toString(),
          avgCost: bal ? bal.avgCost.toString() : '0',
          lastMoveAt: r._max.movementDate,
        };
      }),
    );
    const active = items.filter((it) => new PrismaNs.Decimal(it.onHandQty).gt(0));
    active.sort((a, b) => (a.partNo ?? '').localeCompare(b.partNo ?? ''));

    return { location, items: active };
  }

  /**
   * 倉庫維度：1 warehouseId × N part（含 KPI summary）
   * - summary：total / inStock / zero / negative（對齊既有 stock-balance summary）
   * - items：per-part 列、含 onHandQty / availableQty / avgCost / stockValue
   * - 此 endpoint 不分頁（LITE 範圍小、後續超大量可再加 page/pageSize）
   */
  async byWarehouse(user: RequestUser, warehouseId: string) {
    const tenantId = requireTenantId(user);
    const warehouse = await this.prisma.nx01Warehouse.findFirst({
      where: { id: warehouseId, tenantId },
      select: { id: true, code: true, name: true, isActive: true },
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    const baseWhere = { tenantId, warehouseId };
    const [total, inStock, zero, negative, valueAgg, rows] = await Promise.all([
      this.prisma.nx03StockBalance.count({ where: baseWhere }),
      this.prisma.nx03StockBalance.count({ where: { ...baseWhere, onHandQty: { gt: 0 } } }),
      this.prisma.nx03StockBalance.count({ where: { ...baseWhere, onHandQty: 0 } }),
      this.prisma.nx03StockBalance.count({ where: { ...baseWhere, onHandQty: { lt: 0 } } }),
      this.prisma.nx03StockBalance.aggregate({
        where: baseWhere,
        _sum: { stockValue: true },
      }),
      this.prisma.nx03StockBalance.findMany({
        where: baseWhere,
        orderBy: { partId: 'asc' },
        select: {
          partId: true,
          onHandQty: true,
          reservedQty: true,
          availableQty: true,
          avgCost: true,
          stockValue: true,
          lastMoveAt: true,
          part: { select: { code: true, name: true } },
        },
      }),
    ]);

    return {
      warehouse,
      summary: {
        total,
        inStock,
        zero,
        negative,
        totalStockValue: valueAgg._sum.stockValue?.toString() ?? '0',
      },
      items: rows.map((r) => ({
        partId: r.partId,
        partNo: r.part?.code ?? null,
        partName: r.part?.name ?? null,
        onHandQty: r.onHandQty.toString(),
        reservedQty: r.reservedQty.toString(),
        availableQty: r.availableQty.toString(),
        avgCost: r.avgCost.toString(),
        stockValue: r.stockValue.toString(),
        lastMoveAt: r.lastMoveAt,
      })),
    };
  }
}

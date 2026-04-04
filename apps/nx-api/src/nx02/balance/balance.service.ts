/**
 * File: apps/nx-api/src/nx02/balance/balance.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-BAL-SVC-001：庫存餘額查詢、摘要、首頁 dashboard 統計
 *
 * Notes:
 * - 所有查詢強制 tenantId
 * - minQty 由 nx02_part_stock_setting 合併（is_active=true）
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from 'db-core';

import { PrismaService } from '../../prisma/prisma.service';

import type {
  BalanceSortField,
  BalanceStatusFilter,
  Nx02BalanceDashboardDto,
  SortDir,
} from './dto/balance.dto';

function toNum(d: Prisma.Decimal): number {
  return d.toNumber();
}

@Injectable()
export class BalanceService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * @FUNCTION_CODE NX02-BAL-SVC-001-F02
   */
  private buildBalanceWhere(
    tenantId: string,
    opts: {
      q?: string;
      warehouseId?: string;
      status?: BalanceStatusFilter;
    },
  ): Prisma.Nx02StockBalanceWhereInput {
    const { q, warehouseId, status } = opts;
    const partFilter: Prisma.Nx00PartWhereInput | undefined =
      q && q.trim()
        ? {
          OR: [
            { code: { contains: q.trim(), mode: 'insensitive' } },
            { name: { contains: q.trim(), mode: 'insensitive' } },
          ],
        }
        : undefined;

    const statusWhere: Prisma.Nx02StockBalanceWhereInput = (() => {
      const z = new Prisma.Decimal(0);
      switch (status) {
        case 'in_stock':
          return { onHandQty: { gt: z } };
        case 'zero':
          return { onHandQty: { equals: z } };
        case 'negative':
          return { onHandQty: { lt: z } };
        default:
          return {};
      }
    })();

    return {
      tenantId,
      ...(warehouseId ? { warehouseId } : {}),
      ...statusWhere,
      ...(partFilter ? { part: partFilter } : {}),
    };
  }

  /**
   * @FUNCTION_CODE NX02-BAL-SVC-001-F03
   */
  async list(
    tenantId: string,
    opts: {
      q?: string;
      warehouseId?: string;
      status?: BalanceStatusFilter;
      page: number;
      pageSize: number;
      sortBy: BalanceSortField;
      sortDir: SortDir;
    },
  ) {
    const where = this.buildBalanceWhere(tenantId, opts);
    const skip = (opts.page - 1) * opts.pageSize;
    const dir = opts.sortDir === 'desc' ? 'desc' : 'asc';

    const orderBy: Prisma.Nx02StockBalanceOrderByWithRelationInput[] = (() => {
      switch (opts.sortBy) {
        case 'code':
          return [{ part: { code: dir } }];
        case 'name':
          return [{ part: { name: dir } }];
        case 'on_hand_qty':
          return [{ onHandQty: dir }];
        case 'available_qty':
          return [{ availableQty: dir }];
        case 'stock_value':
          return [{ stockValue: dir }];
        case 'last_move_at':
        default:
          return [{ lastMoveAt: dir }];
      }
    })();

    const [total, rows, settings] = await Promise.all([
      this.prisma.nx02StockBalance.count({ where }),
      this.prisma.nx02StockBalance.findMany({
        where,
        orderBy,
        skip,
        take: opts.pageSize,
        include: {
          part: { include: { partBrand: true } },
          warehouse: true,
        },
      }),
      this.prisma.nx02PartStockSetting.findMany({
        where: { tenantId, isActive: true },
        select: { partId: true, warehouseId: true, minQty: true },
      }),
    ]);

    const minMap = new Map<string, number>();
    for (const s of settings) {
      minMap.set(`${s.partId}|${s.warehouseId}`, s.minQty.toNumber());
    }

    const data = rows.map((b) => {
      const minQty = minMap.get(`${b.partId}|${b.warehouseId}`) ?? null;
      return {
        id: b.id,
        partId: b.partId,
        partCode: b.part.code,
        partName: b.part.name,
        brandName: b.part.partBrand?.name ?? null,
        warehouseId: b.warehouseId,
        warehouseName: b.warehouse.name,
        onHandQty: toNum(b.onHandQty),
        reservedQty: toNum(b.reservedQty),
        availableQty: toNum(b.availableQty),
        inTransitQty: toNum(b.inTransitQty),
        uom: b.part.uom,
        avgCost: toNum(b.avgCost),
        stockValue: toNum(b.stockValue),
        minQty,
        lastMoveAt: b.lastMoveAt.toISOString(),
      };
    });

    return { data, total, page: opts.page, pageSize: opts.pageSize };
  }

  /**
   * @FUNCTION_CODE NX02-BAL-SVC-001-F04
   */
  async summary(tenantId: string, warehouseId?: string) {
    const base: Prisma.Nx02StockBalanceWhereInput = {
      tenantId,
      ...(warehouseId ? { warehouseId } : {}),
    };
    const z = new Prisma.Decimal(0);
    const [total, inStock, zero, negative] = await Promise.all([
      this.prisma.nx02StockBalance.count({ where: base }),
      this.prisma.nx02StockBalance.count({ where: { ...base, onHandQty: { gt: z } } }),
      this.prisma.nx02StockBalance.count({ where: { ...base, onHandQty: { equals: z } } }),
      this.prisma.nx02StockBalance.count({ where: { ...base, onHandQty: { lt: z } } }),
    ]);
    return { total, inStock, zero, negative };
  }

  /**
   * @FUNCTION_CODE NX02-BAL-SVC-001-F05
   */
  async dashboard(tenantId: string): Promise<Nx02BalanceDashboardDto> {
    const z = new Prisma.Decimal(0);
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));

    const [
      inStock,
      zero,
      negative,
      ledgerMonth,
      initCount,
      stockSettingCount,
      stockTakeProgress,
      transferDraft,
      shortageOpen,
      autoRuleActive,
    ] = await Promise.all([
      this.prisma.nx02StockBalance.count({ where: { tenantId, onHandQty: { gt: z } } }),
      this.prisma.nx02StockBalance.count({ where: { tenantId, onHandQty: { equals: z } } }),
      this.prisma.nx02StockBalance.count({ where: { tenantId, onHandQty: { lt: z } } }),
      this.prisma.nx02StockLedger.count({
        where: { tenantId, movementDate: { gte: monthStart } },
      }),
      this.prisma.nx02Init.count({ where: { tenantId } }),
      this.prisma.nx02PartStockSetting.count({
        where: { tenantId, isActive: true, minQty: { gt: z } },
      }),
      this.prisma.nx02StockTake.count({
        where: { tenantId, status: { in: ['D', 'C'] } },
      }),
      this.prisma.nx02StockTransfer.count({
        where: { tenantId, status: 'D' },
      }),
      this.prisma.nx02Shortage.count({
        where: { tenantId, status: 'O' },
      }),
      this.prisma.nx02AutoReplenish.count({
        where: { tenantId, isActive: true },
      }),
    ]);

    return {
      balance: {
        inStock,
        zero,
        negative,
      },
      ledger: {
        thisMonthCount: ledgerMonth,
      },
      init: {
        totalCount: initCount,
      },
      stockSetting: {
        settingCount: stockSettingCount,
      },
      stockTake: {
        inProgressCount: stockTakeProgress,
      },
      transfer: {
        inProgressCount: transferDraft,
      },
      shortage: {
        openCount: shortageOpen,
      },
      autoReplenish: {
        activeRuleCount: autoRuleActive,
      },
    };
  }
}

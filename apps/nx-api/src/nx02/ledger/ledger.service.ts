/**
 * File: apps/nx-api/src/nx02/ledger/ledger.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX02-LED-SVC-001：庫存台帳列表（租戶隔離、日期區間、多選篩選）
 *
 * Notes:
 * - 日期區間最長 92 天（約 3 個月）
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from 'db-core';

import { PrismaService } from '../../prisma/prisma.service';

import { LEDGER_MAX_RANGE_DAYS } from './dto/ledger.dto';

function toNum(d: Prisma.Decimal): number {
  return d.toNumber();
}

function ymdStartUtc(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map((x) => Number(x));
  if (!y || !m || !d) throw new BadRequestException('Invalid date format');
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

function ymdEndUtc(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map((x) => Number(x));
  if (!y || !m || !d) throw new BadRequestException('Invalid date format');
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
}

function defaultMonthStart(): string {
  const n = new Date();
  const y = n.getUTCFullYear();
  const m = String(n.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

function defaultTodayYmd(): string {
  const n = new Date();
  const y = n.getUTCFullYear();
  const m = String(n.getUTCMonth() + 1).padStart(2, '0');
  const d = String(n.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * @FUNCTION_CODE NX02-LED-SVC-001-F01
   */
  list(
    tenantId: string,
    opts: {
      q?: string;
      warehouseId?: string;
      movementTypes?: string[];
      sourceDocTypes?: string[];
      dateFrom?: string;
      dateTo?: string;
      page: number;
      pageSize: number;
    },
  ) {
    const dateFrom = opts.dateFrom?.trim() || defaultMonthStart();
    const dateTo = opts.dateTo?.trim() || defaultTodayYmd();

    const start = ymdStartUtc(dateFrom);
    const end = ymdEndUtc(dateTo);
    if (start > end) {
      throw new BadRequestException('dateFrom must be before or equal to dateTo');
    }
    const days = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
    if (days > LEDGER_MAX_RANGE_DAYS) {
      throw new BadRequestException(`Date range must not exceed ${LEDGER_MAX_RANGE_DAYS} days`);
    }

    const partFilter: Prisma.Nx00PartWhereInput | undefined =
      opts.q && opts.q.trim()
        ? {
          OR: [
            { code: { contains: opts.q.trim(), mode: 'insensitive' } },
            { name: { contains: opts.q.trim(), mode: 'insensitive' } },
          ],
        }
        : undefined;

    const where: Prisma.Nx02StockLedgerWhereInput = {
      tenantId,
      movementDate: { gte: start, lte: end },
      ...(opts.warehouseId ? { warehouseId: opts.warehouseId } : {}),
      ...(opts.movementTypes?.length
        ? { movementType: { in: opts.movementTypes } }
        : {}),
      ...(opts.sourceDocTypes?.length
        ? { sourceDocType: { in: opts.sourceDocTypes } }
        : {}),
      ...(partFilter ? { part: partFilter } : {}),
    };

    const skip = (opts.page - 1) * opts.pageSize;

    return this.prisma.$transaction([
      this.prisma.nx02StockLedger.count({ where }),
      this.prisma.nx02StockLedger.findMany({
        where,
        orderBy: { movementDate: 'desc' },
        skip,
        take: opts.pageSize,
        include: {
          part: true,
          warehouse: true,
          location: true,
        },
      }),
    ]).then(([total, rows]) => ({
      data: rows.map((r) => ({
        id: r.id,
        movementDate: r.movementDate.toISOString(),
        movementType: r.movementType,
        sourceDocType: r.sourceDocType,
        sourceDocId: r.sourceDocId,
        partId: r.partId,
        partCode: r.part.code,
        partName: r.part.name,
        warehouseName: r.warehouse.name,
        locationName: r.location?.name ?? r.location?.code ?? null,
        qtyIn: r.qtyIn.gt(0) ? toNum(r.qtyIn) : null,
        qtyOut: r.qtyOut.gt(0) ? toNum(r.qtyOut) : null,
        unitCost: toNum(r.unitCost),
        totalCost: toNum(r.totalCost),
        balanceQty: toNum(r.balanceQty),
        balanceCost: toNum(r.balanceCost),
        sourceModule: r.sourceModule,
      })),
      total,
      page: opts.page,
      pageSize: opts.pageSize,
    }));
  }
}

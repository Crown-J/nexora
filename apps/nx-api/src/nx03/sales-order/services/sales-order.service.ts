/**
 * File: apps/nx-api/src/nx03/sales-order/services/sales-order.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX03-API-SALES-ORDER-SVC-001：SO list/get/ship（MVP：只做狀態流轉）
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../../nx00/audit-log/services/audit-log.service';
import type { ListSalesOrderQuery, PagedResult, SalesOrderDto } from '../dto/sales-order.dto';
import { assertSalesOrderStatusTransition } from '../../../shared/workflows/nx01-nx03-workflow';

type SoRow = {
  id: string;
  docNo: string;
  soDate: Date;
  customerId: string;
  sourceQuoteId: string | null;
  currency: string;
  status: string;
  remark: string | null;
  postedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: {
    id: string;
    lineNo: number;
    sourceQuoteItemId: string | null;
    partId: string;
    partNo: string;
    partName: string;
    qty: any;
    unitPrice: any;
    warehouseId: string;
    locationId: string | null;
    remark: string | null;
  }[];
};

function toSoDto(row: SoRow): SalesOrderDto {
  return {
    id: row.id,
    docNo: row.docNo,
    soDate: row.soDate?.toISOString?.() ?? String(row.soDate),
    customerId: row.customerId,
    quoteId: row.sourceQuoteId ?? '',
    currency: row.currency,
    status: row.status,
    remark: row.remark ?? null,
    postedAt: null, // model 目前沒有 shipped/done date 欄位（MVP）
    createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
    updatedAt: row.updatedAt?.toISOString?.() ?? String(row.updatedAt),
    items: row.items.map((it) => ({
      id: it.id,
      lineNo: it.lineNo,
      quoteItemId: it.sourceQuoteItemId ?? '',
      partId: it.partId,
      partNo: it.partNo,
      partName: it.partName,
      qty: it.qty?.toString?.() ?? String(it.qty),
      unitPrice: it.unitPrice?.toString?.() ?? String(it.unitPrice),
      warehouseId: it.warehouseId,
      locationId: it.locationId ?? null,
      remark: it.remark ?? null,
    })),
  };
}

@Injectable()
export class SalesOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(query: ListSalesOrderQuery): Promise<PagedResult<SalesOrderDto>> {
    const page = Number.isFinite(query.page as any) && (query.page as number) > 0 ? Number(query.page) : 1;
    const pageSize =
      Number.isFinite(query.pageSize as any) && (query.pageSize as number) > 0 ? Number(query.pageSize) : 20;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [{ docNo: { contains: q, mode: 'insensitive' as const } }, { customerId: { contains: q } }];
    }

    const [total, rows] = await Promise.all([
      this.prisma.nx03So.count({ where }),
      this.prisma.nx03So.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          items: {
            orderBy: [{ lineNo: 'asc' }],
            select: {
              id: true,
              lineNo: true,
              sourceQuoteItemId: true,
              partId: true,
              partNo: true,
              partName: true,
              qty: true,
              unitPrice: true,
              warehouseId: true,
              locationId: true,
              remark: true,
            },
          },
        },
      }),
    ]);

    return {
      items: (rows as unknown as SoRow[]).map(toSoDto),
      page,
      pageSize,
      total,
    };
  }

  async get(id: string): Promise<SalesOrderDto> {
    const row = await this.prisma.nx03So.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: [{ lineNo: 'asc' }],
          select: {
            id: true,
            lineNo: true,
            sourceQuoteItemId: true,
            partId: true,
            partNo: true,
            partName: true,
            qty: true,
            unitPrice: true,
            warehouseId: true,
            locationId: true,
            remark: true,
          },
        },
      },
    });

    if (!row) throw new NotFoundException('Sales order not found');
    return toSoDto(row as unknown as SoRow);
  }

  async ship(id: string, ctx?: { actorUserId?: string; ipAddr?: string | null; userAgent?: string | null }): Promise<SalesOrderDto> {
    const existing = await this.prisma.nx03So.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: [{ lineNo: 'asc' }],
          select: {
            id: true,
            lineNo: true,
            sourceQuoteItemId: true,
            partId: true,
            partNo: true,
            partName: true,
            qty: true,
            unitPrice: true,
            warehouseId: true,
            locationId: true,
            remark: true,
          },
        },
      },
    });

    if (!existing) throw new NotFoundException('Sales order not found');

    const current = existing.status as any;
    const next = current === 'S' ? 'X' : 'S';
    const shouldDecrementStock = current === 'R' && next === 'S';

    try {
      assertSalesOrderStatusTransition(current, next);
    } catch (e: any) {
      throw new BadRequestException(e?.message ?? 'Cannot ship SO');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const tenantId = (existing as any).tenantId as string;

      if (shouldDecrementStock) {
        // Outbound stock posting (SO 出貨 → 庫存 -)
        for (const item of (existing as { items: SoRow['items'] }).items) {
          const beforeRow = await tx.nx02StockBalance.findFirst({
            where: { tenantId, warehouseId: item.warehouseId, partId: item.partId },
            select: { id: true, onHandQty: true },
          });

          const zero = item.qty.mul(0 as any);
          const beforeQty = beforeRow?.onHandQty ?? zero;

          if (beforeQty.lt(item.qty)) {
            throw new BadRequestException(
              `Insufficient stock: part=${item.partId} warehouse=${item.warehouseId} need=${item.qty?.toString?.() ?? String(item.qty)}`,
            );
          }

          const afterQty = beforeQty.sub(item.qty);

          if (!beforeRow) {
            // should not happen because beforeQty would be 0 and lt would throw
            throw new BadRequestException('Stock balance not found');
          }

          await tx.nx02StockBalance.update({
            where: { id: beforeRow.id },
            data: {
              onHandQty: afterQty,
              updatedBy: ctx?.actorUserId ?? null,
            },
          });

          await tx.nx02StockLedger.create({
            data: {
              tenantId,
              movementDate: new Date(),
              occurredAt: new Date(),
              txnType: 'O',
              refType: 'SO',
              refId: existing.id,
              partId: item.partId,
              warehouseId: item.warehouseId,
              qtyDelta: item.qty.mul(-1 as any),
              beforeQty,
              afterQty,
              movementType: 'O',
              qtyIn: zero,
              qtyOut: item.qty,
              sourceModule: 'NX03',
              sourceDocType: 'S',
              sourceDocId: existing.id,
              sourceItemId: item.id,
              remark: item.remark ?? null,
              createdBy: ctx?.actorUserId ?? null,
              updatedBy: ctx?.actorUserId ?? null,
            },
          });
        }
      }

      return tx.nx03So.update({
        where: { id },
        data: {
          status: next,
          updatedBy: ctx?.actorUserId ?? null,
        },
        include: {
          items: {
            orderBy: [{ lineNo: 'asc' }],
          },
        },
      });
    });

    if (ctx?.actorUserId) {
      await this.audit.write({
        actorUserId: ctx.actorUserId,
        moduleCode: 'NX03',
        action: 'SHIP',
        entityTable: 'nx03_so',
        entityId: updated.id,
        entityCode: updated.docNo,
        summary: `Ship SO ${updated.docNo}`,
        afterData: updated,
        ipAddr: ctx.ipAddr ?? null,
        userAgent: ctx.userAgent ?? null,
      });
    }

    return toSoDto(updated as unknown as SoRow);
  }
}


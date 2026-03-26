/**
 * File: apps/nx-api/src/nx01/po/services/po.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01-API-PO-SVC-001：PO CRUD（MVP：list/get/post）
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../../nx00/audit-log/services/audit-log.service';
import type { ListPoQuery, PagedResult, PoDto } from '../dto/po.dto';
import { assertPoStatusTransition } from '../../../shared/workflows/nx01-nx03-workflow';

type PoRow = {
  id: string;
  docNo: string;
  poDate: Date;
  supplierId: string;
  rfqId: string | null;
  currency: string;
  subtotal: any;
  taxAmount: any;
  totalAmount: any;
  status: string;
  postedAt: Date | null;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: {
    id: string;
    lineNo: number;
    partId: string;
    partNo: string;
    partName: string;
    warehouseId: string;
    locationId: string | null;
    qty: any;
    unitCost: any;
    lineAmount: any;
    remark: string | null;
  }[];
};

function toPoDto(row: PoRow): PoDto {
  return {
    id: row.id,
    docNo: row.docNo,
    poDate: row.poDate?.toISOString?.() ?? String(row.poDate),
    supplierId: row.supplierId,
    rfqId: row.rfqId,
    currency: row.currency,
    subtotal: row.subtotal?.toString?.() ?? String(row.subtotal),
    taxAmount: row.taxAmount?.toString?.() ?? String(row.taxAmount),
    totalAmount: row.totalAmount?.toString?.() ?? String(row.totalAmount),
    status: row.status,
    postedAt: row.postedAt ? row.postedAt.toISOString() : null,
    remark: row.remark ?? null,
    items: row.items.map((it) => ({
      id: it.id,
      lineNo: it.lineNo,
      partId: it.partId,
      partNo: it.partNo,
      partName: it.partName,
      warehouseId: it.warehouseId,
      locationId: it.locationId ?? null,
      qty: it.qty?.toString?.() ?? String(it.qty),
      unitCost: it.unitCost?.toString?.() ?? String(it.unitCost),
      lineAmount: it.lineAmount?.toString?.() ?? String(it.lineAmount),
      remark: it.remark ?? null,
    })),
  };
}

@Injectable()
export class PoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(query: ListPoQuery): Promise<PagedResult<PoDto>> {
    const page = Number.isFinite(query.page as any) && (query.page as number) > 0 ? Number(query.page) : 1;
    const pageSize =
      Number.isFinite(query.pageSize as any) && (query.pageSize as number) > 0 ? Number(query.pageSize) : 20;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [{ docNo: { contains: q, mode: 'insensitive' as const } }, { supplierId: { contains: q } }];
    }

    const [total, rows] = await Promise.all([
      this.prisma.nx01Po.count({ where }),
      this.prisma.nx01Po.findMany({
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
              partId: true,
              partNo: true,
              partName: true,
              warehouseId: true,
              locationId: true,
              qty: true,
              unitCost: true,
              lineAmount: true,
              remark: true,
            },
          },
        },
      }),
    ]);

    return {
      items: (rows as unknown as PoRow[]).map(toPoDto),
      page,
      pageSize,
      total,
    };
  }

  async get(id: string): Promise<PoDto> {
    const row = await this.prisma.nx01Po.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: [{ lineNo: 'asc' }],
          select: {
            id: true,
            lineNo: true,
            partId: true,
            partNo: true,
            partName: true,
            warehouseId: true,
            locationId: true,
            qty: true,
            unitCost: true,
            lineAmount: true,
            remark: true,
          },
        },
      },
    });

    if (!row) throw new NotFoundException('PO not found');
    return toPoDto(row as unknown as PoRow);
  }

  async post(id: string, ctx?: { actorUserId?: string; ipAddr?: string | null; userAgent?: string | null }): Promise<PoDto> {
    const existing = await this.prisma.nx01Po.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: [{ lineNo: 'asc' }],
          select: {
            id: true,
            lineNo: true,
            partId: true,
            partNo: true,
            partName: true,
            warehouseId: true,
            locationId: true,
            qty: true,
            unitCost: true,
            lineAmount: true,
            remark: true,
          },
        },
      },
    });

    if (!existing) throw new NotFoundException('PO not found');

    try {
      assertPoStatusTransition(existing.status as any, 'P');
    } catch (e: any) {
      throw new BadRequestException(e?.message ?? 'Cannot post PO');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const tenantId =
        existing.tenantId ??
        (await tx.nx99Tenant.findUnique({ where: { code: 'DEV-INNOVA' }, select: { id: true } }))?.id;
      if (!tenantId) throw new BadRequestException('tenantId is required for stock posting');

      const updatedPo = await tx.nx01Po.update({
        where: { id },
        data: {
          status: 'P',
          postedAt: new Date(),
          postedBy: ctx?.actorUserId ?? null,
          updatedBy: ctx?.actorUserId ?? null,
        },
        include: {
          items: {
            orderBy: [{ lineNo: 'asc' }],
          },
        },
      });

      // Inbound stock posting (PO過帳 → 庫存 +)
      for (const item of existing.items ?? []) {
        const beforeRow = await tx.nx09StockBalance.findFirst({
          where: { tenantId, warehouseId: item.warehouseId, partId: item.partId },
          select: { id: true, qty: true },
        });

        const zero = item.qty.mul(0 as any);
        const beforeQty = beforeRow?.qty ?? zero;
        const afterQty = beforeQty.add(item.qty);

        if (beforeRow) {
          await tx.nx09StockBalance.update({
            where: { id: beforeRow.id },
            data: {
              qty: afterQty,
              updatedBy: ctx?.actorUserId ?? null,
            },
          });
        } else {
          await tx.nx09StockBalance.create({
            data: {
              tenantId,
              warehouseId: item.warehouseId,
              partId: item.partId,
              qty: item.qty,
              createdBy: ctx?.actorUserId ?? null,
              updatedBy: ctx?.actorUserId ?? null,
            },
          });
        }

        await tx.nx09StockTxn.create({
          data: {
            tenantId,
            txnType: 'I',
            refType: 'PO',
            refId: updatedPo.id,
            partId: item.partId,
            warehouseId: item.warehouseId,
            qtyDelta: item.qty,
            beforeQty,
            afterQty,
            remark: item.remark ?? null,
            createdBy: ctx?.actorUserId ?? null,
            updatedBy: ctx?.actorUserId ?? null,
          },
        });
      }

      return updatedPo;
    });

    if (ctx?.actorUserId) {
      await this.audit.write({
        actorUserId: ctx.actorUserId,
        moduleCode: 'NX01',
        action: 'POST',
        entityTable: 'nx01_po',
        entityId: updated.id,
        entityCode: updated.docNo,
        summary: `Post PO ${updated.docNo}`,
        afterData: updated,
        ipAddr: ctx.ipAddr ?? null,
        userAgent: ctx.userAgent ?? null,
      });
    }

    return toPoDto(updated as unknown as PoRow);
  }
}


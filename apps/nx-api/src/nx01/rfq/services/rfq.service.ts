/**
 * File: apps/nx-api/src/nx01/rfq/services/rfq.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX01-API-RFQ-SVC-001：RFQ CRUD + RFQ → PO
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../../nx00/audit-log/services/audit-log.service';
import type {
  CreateRfqBody,
  CreateRfqItemBody,
  ListRfqQuery,
  RfqDto,
  RfqItemDto,
  ToPoFromRfqBody,
  UpdateRfqBody,
} from '../dto/rfq.dto';

import type { PagedResult } from '../dto/rfq.dto';

import { RFQ_STATUS } from '../../../shared/workflows/nx01-nx03-workflow';

import type { PoDto } from '../../po/dto/po.dto';

type RfqRow = {
  id: string;
  docNo: string;
  rfqDate: Date;
  supplierId: string;
  contactName: string | null;
  contactPhone: string | null;
  currency: string;
  status: string;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: {
    id: string;
    lineNo: number;
    partId: string;
    partNo: string;
    partName: string;
    qty: any;
    unitPrice: any | null;
    leadTimeDays: number | null;
    currency: string;
    status: string;
    remark: string | null;
  }[];
};

function toRfqItemDto(item: RfqRow['items'][number]): RfqItemDto {
  return {
    id: item.id,
    lineNo: item.lineNo,
    partId: item.partId,
    partNo: item.partNo,
    partName: item.partName,
    qty: item.qty?.toString?.() ?? String(item.qty),
    unitPrice: item.unitPrice?.toString?.() ?? null,
    leadTimeDays: item.leadTimeDays ?? null,
    currency: item.currency,
    status: item.status,
    remark: item.remark ?? null,
  };
}

function toRfqDto(row: RfqRow): RfqDto {
  return {
    id: row.id,
    docNo: row.docNo,
    rfqDate: row.rfqDate?.toISOString?.() ?? String(row.rfqDate),
    supplierId: row.supplierId,
    contactName: row.contactName,
    contactPhone: row.contactPhone,
    currency: row.currency,
    status: row.status,
    remark: row.remark,
    createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
    updatedAt: row.updatedAt?.toISOString?.() ?? String(row.updatedAt),
    items: row.items.map(toRfqItemDto),
  };
}

function parseIsoDateOrThrow(v: string, fieldName: string): Date {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new BadRequestException(`Invalid ${fieldName}`);
  return d;
}

@Injectable()
export class RfqService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(query: ListRfqQuery): Promise<PagedResult<RfqDto>> {
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
      this.prisma.nx01Rfq.count({ where }),
      this.prisma.nx01Rfq.findMany({
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
              qty: true,
              unitPrice: true,
              leadTimeDays: true,
              currency: true,
              status: true,
              remark: true,
            },
          },
        },
      }),
    ]);

    return {
      items: (rows as unknown as RfqRow[]).map(toRfqDto),
      page,
      pageSize,
      total,
    };
  }

  async get(id: string): Promise<RfqDto> {
    const row = await this.prisma.nx01Rfq.findUnique({
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
            qty: true,
            unitPrice: true,
            leadTimeDays: true,
            currency: true,
            status: true,
            remark: true,
          },
        },
      },
    });

    if (!row) throw new NotFoundException('RFQ not found');
    return toRfqDto(row as unknown as RfqRow);
  }

  async create(body: CreateRfqBody, ctx?: { actorUserId?: string; ipAddr?: string | null; userAgent?: string | null }): Promise<RfqDto> {
    const docNo = body.docNo?.trim();
    const rfqDate = body.rfqDate?.trim();

    if (!docNo) throw new BadRequestException('docNo is required');
    if (!rfqDate) throw new BadRequestException('rfqDate is required');
    if (!body.supplierId) throw new BadRequestException('supplierId is required');
    if (!Array.isArray(body.items) || body.items.length === 0) throw new BadRequestException('items is required');

    const supplier = await this.prisma.nx00Partner.findUnique({ where: { id: body.supplierId }, select: { id: true } });
    if (!supplier) throw new BadRequestException('supplier not found');

    const partIds = body.items.map((i) => i.partId);
    const partRows = await this.prisma.nx00Part.findMany({ where: { id: { in: partIds } }, select: { id: true, code: true, name: true } });
    const partById = new Map(partRows.map((p) => [p.id, p]));

    for (const it of body.items) {
      if (!partById.has(it.partId)) throw new BadRequestException(`part not found: ${it.partId}`);
    }

    const status: string = body.items.every((i) => i.unitPrice !== undefined && i.unitPrice !== null) ? RFQ_STATUS.REPLIED : RFQ_STATUS.DRAFT;
    const d = parseIsoDateOrThrow(body.rfqDate, 'rfqDate');

    try {
      const created = await this.prisma.nx01Rfq.create({
        data: {
          docNo,
          tenantId: null, // MVP：目前租戶綁定流程尚未串（由 front-end auth policy 決定後補）
          rfqDate: d,
          supplierId: body.supplierId,
          contactName: body.contactName ?? null,
          contactPhone: body.contactPhone ?? null,
          currency: (body.currency ?? 'TWD').trim() || 'TWD',
          status,
          remark: body.remark ?? null,
          createdBy: ctx?.actorUserId ?? null,
          updatedBy: ctx?.actorUserId ?? null,
          items: {
            create: body.items.map((it, idx) => this.toRfqItemCreate(it, idx, partById, body)),
          },
        },
        include: {
          items: {
            orderBy: [{ lineNo: 'asc' }],
            select: {
              id: true,
              lineNo: true,
              partId: true,
              partNo: true,
              partName: true,
              qty: true,
              unitPrice: true,
              leadTimeDays: true,
              currency: true,
              status: true,
              remark: true,
            },
          },
        },
      });

      if (ctx?.actorUserId) {
        await this.audit.write({
          actorUserId: ctx.actorUserId,
          moduleCode: 'NX01',
          action: 'CREATE',
          entityTable: 'nx01_rfq',
          entityId: created.id,
          entityCode: created.docNo,
          summary: `Create RFQ ${created.docNo}`,
          afterData: created,
          ipAddr: ctx.ipAddr ?? null,
          userAgent: ctx.userAgent ?? null,
        });
      }

      return toRfqDto(created as unknown as RfqRow);
    } catch (e: any) {
      const pe = e as any;
      // P2002：unique violation（doc_no）
      if (pe?.code === 'P2002') throw new BadRequestException('docNo 已存在，請更換');
      throw e;
    }
  }

  async update(id: string, body: UpdateRfqBody, ctx?: { actorUserId?: string; ipAddr?: string | null; userAgent?: string | null }): Promise<RfqDto> {
    const existing = await this.prisma.nx01Rfq.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) throw new NotFoundException('RFQ not found');

    if (existing.status !== RFQ_STATUS.DRAFT) {
      throw new BadRequestException('Only DRAFT RFQ can be updated');
    }

    const dItems = body.items;
    if (!Array.isArray(dItems) || dItems.length === 0) throw new BadRequestException('items is required');

    const partIds = dItems.map((i) => i.partId);
    const partRows = await this.prisma.nx00Part.findMany({ where: { id: { in: partIds } }, select: { id: true, code: true, name: true } });
    const partById = new Map(partRows.map((p) => [p.id, p]));
    for (const it of dItems) {
      if (!partById.has(it.partId)) throw new BadRequestException(`part not found: ${it.partId}`);
    }

    const newStatus: string = dItems.every((i) => i.unitPrice !== undefined && i.unitPrice !== null) ? RFQ_STATUS.REPLIED : RFQ_STATUS.DRAFT;

    await this.prisma.nx01RfqItem.deleteMany({ where: { rfqId: id } });

    const updated = await this.prisma.nx01Rfq.update({
      where: { id },
      data: {
        contactName: body.contactName ?? existing.contactName,
        contactPhone: body.contactPhone ?? existing.contactPhone,
        currency: body.currency ?? existing.currency,
        remark: body.remark ?? existing.remark,
        status: newStatus,
        updatedBy: ctx?.actorUserId ?? null,
        items: {
          create: dItems.map((it, idx) =>
            this.toRfqItemCreate(
              {
                partId: it.partId,
                qty: it.qty,
                unitPrice: it.unitPrice as any,
                leadTimeDays: it.leadTimeDays,
                remark: it.remark,
              },
              idx,
              partById,
              { currency: body.currency ?? existing.currency } as any,
            ),
          ),
        },
      },
      include: {
        items: {
          orderBy: [{ lineNo: 'asc' }],
          select: {
            id: true,
            lineNo: true,
            partId: true,
            partNo: true,
            partName: true,
            qty: true,
            unitPrice: true,
            leadTimeDays: true,
            currency: true,
            status: true,
            remark: true,
          },
        },
      },
    });

    if (ctx?.actorUserId) {
      await this.audit.write({
        actorUserId: ctx.actorUserId,
        moduleCode: 'NX01',
        action: 'UPDATE',
        entityTable: 'nx01_rfq',
        entityId: updated.id,
        entityCode: updated.docNo,
        summary: `Update RFQ ${updated.docNo}`,
        afterData: updated,
        ipAddr: ctx.ipAddr ?? null,
        userAgent: ctx.userAgent ?? null,
      });
    }

    return toRfqDto(updated as unknown as RfqRow);
  }

  private toRfqItemCreate(
    it: CreateRfqItemBody,
    idx: number,
    partById: Map<string, { id: string; code: string; name: string }>,
    body: { currency?: string },
  ) {
    const part = partById.get(it.partId)!;

    return {
      lineNo: idx + 1,
      partId: part.id,
      partNo: part.code,
      partName: part.name,
      qty: String(it.qty) as any,
      unitPrice: String(it.unitPrice) as any,
      currency: (body.currency ?? 'TWD').trim() || 'TWD',
      leadTimeDays: it.leadTimeDays ?? null,
      status: RFQ_STATUS.REPLIED,
      remark: it.remark ?? null,
    };
  }

  async createPoFromRfq(rfqId: string, body: ToPoFromRfqBody, ctx?: { actorUserId?: string; ipAddr?: string | null; userAgent?: string | null }): Promise<PoDto> {
    const rfq = await this.prisma.nx01Rfq.findUnique({
      where: { id: rfqId },
      include: {
        items: true,
      },
    });

    if (!rfq) throw new NotFoundException('RFQ not found');
    if (rfq.status !== RFQ_STATUS.REPLIED) {
      throw new BadRequestException('RFQ must be REPLIED before creating PO');
    }

    const rfqItems = rfq.items.filter((it) => it.unitPrice !== null);
    if (rfqItems.length === 0) throw new BadRequestException('RFQ items have no unitPrice');

    const poDate = parseIsoDateOrThrow(body.poDate, 'poDate');
    const currency = (body.currency ?? rfq.currency ?? 'TWD').trim() || 'TWD';

    const docNo = body.docNo?.trim();
    if (!docNo) throw new BadRequestException('po docNo is required');

    const lineRows = rfqItems.map((it) => {
      const unitCost = it.unitPrice!;
      const lineAmount = unitCost.mul(it.qty);
      return {
        rfqItemId: it.id,
        partId: it.partId,
        partNo: it.partNo,
        partName: it.partName,
        qty: it.qty,
        unitCost,
        lineAmount,
      };
    });

    const subtotal = lineRows.reduce((acc: any, r: any) => acc.add(r.lineAmount), lineRows[0].lineAmount);

    try {
      const po = await this.prisma.nx01Po.create({
        data: {
          docNo,
          tenantId: rfq.tenantId ?? null,
          poDate,
          supplierId: rfq.supplierId,
          rfqId: rfq.id,
          currency,
          subtotal,
          taxAmount: '0' as any,
          totalAmount: subtotal,
          status: 'D',
          remark: body.remark ?? null,
          createdBy: ctx?.actorUserId ?? null,
          updatedBy: ctx?.actorUserId ?? null,
          items: {
            create: lineRows.map((r, idx) => ({
              lineNo: idx + 1,
              partId: r.partId,
              partNo: r.partNo,
              partName: r.partName,
              warehouseId: body.warehouseId,
              locationId: body.locationId ?? null,
              qty: r.qty,
              unitCost: r.unitCost,
              lineAmount: r.lineAmount,
              remark: null,
              createdBy: ctx?.actorUserId ?? null,
              updatedBy: ctx?.actorUserId ?? null,
            })),
          },
        },
        include: {
          items: {
            orderBy: [{ lineNo: 'asc' }],
          },
        },
      });

      await this.prisma.nx01Rfq.update({
        where: { id: rfq.id },
        data: {
          status: 'C',
          updatedBy: ctx?.actorUserId ?? null,
        },
      });

      if (ctx?.actorUserId) {
        await this.audit.write({
          actorUserId: ctx.actorUserId,
          moduleCode: 'NX01',
          action: 'CREATE',
          entityTable: 'nx01_po',
          entityId: po.id,
          entityCode: po.docNo,
          summary: `Create PO ${po.docNo} from RFQ ${rfq.docNo}`,
          afterData: po,
          ipAddr: ctx.ipAddr ?? null,
          userAgent: ctx.userAgent ?? null,
        });
      }

      return this.toPoDto(po, rfq);
    } catch (e: any) {
      const pe = e as any;
      if (pe?.code === 'P2002') throw new BadRequestException('PO docNo 已存在，請更換');
      throw e;
    }
  }

  private toPoDto(po: any, rfq: any): PoDto {
    return {
      id: po.id,
      docNo: po.docNo,
      poDate: po.poDate?.toISOString?.() ?? String(po.poDate),
      supplierId: po.supplierId,
      rfqId: po.rfqId,
      currency: po.currency,
      subtotal: po.subtotal?.toString?.() ?? String(po.subtotal),
      taxAmount: po.taxAmount?.toString?.() ?? String(po.taxAmount),
      totalAmount: po.totalAmount?.toString?.() ?? String(po.totalAmount),
      status: po.status,
      postedAt: po.postedAt?.toISOString?.() ?? null,
      remark: po.remark ?? null,
      items: (po.items ?? []).map((it: any, idx: number) => ({
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
}


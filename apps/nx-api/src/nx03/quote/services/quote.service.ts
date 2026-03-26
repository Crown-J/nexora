/**
 * File: apps/nx-api/src/nx03/quote/services/quote.service.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX03-API-QUOTE-SVC-001：QUOTE（對客報價）建立 + 成交（accept）→ 產生 PO + SO
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../../nx00/audit-log/services/audit-log.service';
import type {
  AcceptQuoteBody,
  CreateQuoteBody,
  ListQuoteQuery,
  PagedResult,
  QuoteDto,
  QuoteItemDto,
} from '../dto/quote.dto';

import { assertQuoteStatusTransition, assertRfqStatusTransition } from '../../../shared/workflows/nx01-nx03-workflow';

type QuoteItemRow = {
  id: string;
  lineNo: number;
  rfqItemId: string;
  partId: string;
  partNo: string;
  partName: string;
  qty: any;
  unitCost: any;
  unitPrice: any;
  markupType: string | null;
  markupValue: any | null;
  currency: string;
  leadTimeDays: number | null;
  remark: string | null;
};

type QuoteRow = {
  id: string;
  docNo: string;
  quoteDate: Date;
  customerId: string;
  rfqId: string | null;
  currency: string;
  status: string;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: QuoteItemRow[];
};

function parseIsoDateOrThrow(v: string, fieldName: string): Date {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new BadRequestException(`Invalid ${fieldName}`);
  return d;
}

function toQuoteItemDto(item: QuoteItemRow): QuoteItemDto {
  return {
    id: item.id,
    lineNo: item.lineNo,
    rfqItemId: item.rfqItemId,
    partId: item.partId,
    partNo: item.partNo,
    partName: item.partName,
    qty: item.qty?.toString?.() ?? String(item.qty),
    unitCost: item.unitCost?.toString?.() ?? String(item.unitCost),
    unitPrice: item.unitPrice?.toString?.() ?? String(item.unitPrice),
    markupType: item.markupType ?? null,
    markupValue: item.markupValue?.toString?.() ?? null,
    currency: item.currency,
    leadTimeDays: item.leadTimeDays ?? null,
    remark: item.remark ?? null,
  };
}

function toQuoteDto(row: QuoteRow): QuoteDto {
  return {
    id: row.id,
    docNo: row.docNo,
    quoteDate: row.quoteDate?.toISOString?.() ?? String(row.quoteDate),
    customerId: row.customerId,
    rfqId: row.rfqId,
    currency: row.currency,
    status: row.status,
    remark: row.remark ?? null,
    createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
    updatedAt: row.updatedAt?.toISOString?.() ?? String(row.updatedAt),
    items: row.items.map(toQuoteItemDto),
  };
}

@Injectable()
export class QuoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(query: ListQuoteQuery): Promise<PagedResult<QuoteDto>> {
    const page = Number.isFinite(query.page as any) && (query.page as number) > 0 ? Number(query.page) : 1;
    const pageSize =
      Number.isFinite(query.pageSize as any) && (query.pageSize as number) > 0 ? Number(query.pageSize) : 20;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { docNo: { contains: q, mode: 'insensitive' as const } },
        { customerId: { contains: q } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.nx07Quote.count({ where }),
      this.prisma.nx07Quote.findMany({
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
              rfqItemId: true,
              partId: true,
              partNo: true,
              partName: true,
              qty: true,
              unitCost: true,
              unitPrice: true,
              markupType: true,
              markupValue: true,
              currency: true,
              leadTimeDays: true,
              remark: true,
            },
          },
        },
      }),
    ]);

    return {
      items: (rows as unknown as QuoteRow[]).map(toQuoteDto),
      page,
      pageSize,
      total,
    };
  }

  async get(id: string): Promise<QuoteDto> {
    const row = await this.prisma.nx07Quote.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: [{ lineNo: 'asc' }],
          select: {
            id: true,
            lineNo: true,
            rfqItemId: true,
            partId: true,
            partNo: true,
            partName: true,
            qty: true,
            unitCost: true,
            unitPrice: true,
            markupType: true,
            markupValue: true,
            currency: true,
            leadTimeDays: true,
            remark: true,
          },
        },
      },
    });

    if (!row) throw new NotFoundException('Quote not found');
    return toQuoteDto(row as unknown as QuoteRow);
  }

  private async resolveTenantIdOrThrow(tenantId: string | null | undefined): Promise<string> {
    if (tenantId) return tenantId;
    const dev = await this.prisma.nx99Tenant.findUnique({ where: { code: 'DEV-INNOVA' }, select: { id: true } });
    if (!dev) throw new BadRequestException('DEV-INNOVA tenant not found');
    return dev.id;
  }

  private toNumber(v: number | string): number {
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) throw new BadRequestException('Invalid number');
    return n;
  }

  async create(body: CreateQuoteBody, ctx?: { actorUserId?: string; ipAddr?: string | null; userAgent?: string | null }): Promise<QuoteDto> {
    const docNo = body.docNo?.trim();
    if (!docNo) throw new BadRequestException('docNo is required');
    if (!body.customerId) throw new BadRequestException('customerId is required');
    if (!body.rfqId) throw new BadRequestException('rfqId is required');
    if (!body.items?.length) throw new BadRequestException('items is required');

    const rfq = await this.prisma.nx01Rfq.findUnique({
      where: { id: body.rfqId },
      include: { items: true },
    });
    if (!rfq) throw new NotFoundException('RFQ not found');

    // 報價建立至少需要成本（rfqItem.unitPrice）
    const rfqItemIds = body.items.map((i) => i.rfqItemId);
    const rfqItems = rfq.items.filter((it) => rfqItemIds.includes(it.id));
    if (rfqItems.length !== rfqItemIds.length) throw new BadRequestException('Some rfq items not found');

    for (const it of rfqItems) {
      if (it.unitPrice === null) throw new BadRequestException('RFQ item unitPrice is required for quotation');
    }

    const tenantId = await this.resolveTenantIdOrThrow(rfq.tenantId);
    const quoteDate = parseIsoDateOrThrow(body.quoteDate, 'quoteDate');

    const markupValueNum = this.toNumber(body.markupValue);
    const currency = (body.currency ?? rfq.currency ?? 'TWD').trim() || 'TWD';

    const quoteItems = body.items.map((it, idx) => {
      const rfqItem = rfqItems.find((x) => x.id === it.rfqItemId)!;

      const costNum = Number(rfqItem.unitPrice!.toString());
      const qtyValue = it.qty !== undefined && it.qty !== null ? it.qty : rfqItem.qty;
      const qtyDecStr = String(qtyValue?.toString?.() ?? qtyValue);

      const unitPriceNum =
        body.markupType === 'P'
          ? costNum * (1 + markupValueNum / 100)
          : costNum + markupValueNum;

      const unitPriceStr = unitPriceNum.toFixed(4);

      return {
        lineNo: idx + 1,
        rfqItemId: it.rfqItemId,
        partId: rfqItem.partId,
        partNo: rfqItem.partNo,
        partName: rfqItem.partName,
        qty: qtyDecStr as any,
        unitCost: rfqItem.unitPrice!.toString() as any,
        unitPrice: unitPriceStr as any,
        markupType: body.markupType,
        markupValue: markupValueNum.toFixed(4) as any,
        currency,
        leadTimeDays: rfqItem.leadTimeDays ?? null,
        remark: null,
      };
    });

    const createdQuote = await this.prisma.nx07Quote.create({
      data: {
        tenantId,
        docNo,
        quoteDate,
        customerId: body.customerId,
        rfqId: body.rfqId,
        currency,
        status: 'D',
        remark: body.remark ?? null,
        createdBy: ctx?.actorUserId ?? null,
        updatedBy: ctx?.actorUserId ?? null,
      },
    });

    await this.prisma.nx07QuoteItem.createMany({
      data: quoteItems.map((it) => ({
        tenantId,
        quoteId: createdQuote.id,
        lineNo: it.lineNo,
        rfqItemId: it.rfqItemId,
        partId: it.partId,
        partNo: it.partNo,
        partName: it.partName,
        qty: it.qty as any,
        unitCost: it.unitCost as any,
        unitPrice: it.unitPrice as any,
        markupType: it.markupType,
        markupValue: it.markupValue as any,
        currency: it.currency,
        leadTimeDays: it.leadTimeDays,
        remark: it.remark ?? null,
      })),
    });

    const created = await this.prisma.nx07Quote.findUnique({
      where: { id: createdQuote.id },
      include: {
        items: {
          orderBy: [{ lineNo: 'asc' }],
          select: {
            id: true,
            lineNo: true,
            rfqItemId: true,
            partId: true,
            partNo: true,
            partName: true,
            qty: true,
            unitCost: true,
            unitPrice: true,
            markupType: true,
            markupValue: true,
            currency: true,
            leadTimeDays: true,
            remark: true,
          },
        },
      },
    });

    if (!created) throw new BadRequestException('Quote item create failed');

    if (ctx?.actorUserId) {
      await this.audit.write({
        actorUserId: ctx.actorUserId,
        moduleCode: 'NX03',
        action: 'CREATE',
        entityTable: 'nx07_quote',
        entityId: createdQuote.id,
        entityCode: createdQuote.docNo,
        summary: `Create QUOTE ${createdQuote.docNo}`,
        afterData: created,
        ipAddr: ctx.ipAddr ?? null,
        userAgent: ctx.userAgent ?? null,
      });
    }

    return toQuoteDto(created as unknown as QuoteRow);
  }

  async acceptQuote(
    quoteId: string,
    body: AcceptQuoteBody,
    ctx?: { actorUserId?: string; ipAddr?: string | null; userAgent?: string | null },
  ): Promise<{ quoteId: string; poId: string; salesOrderId: string; poDocNo: string; soDocNo: string }> {
    const quote = await this.prisma.nx07Quote.findUnique({
      where: { id: quoteId },
      include: {
        items: true,
      },
    });

    if (!quote) throw new NotFoundException('Quote not found');

    try {
      assertQuoteStatusTransition(quote.status as any, 'A');
    } catch (e: any) {
      throw new BadRequestException(e?.message ?? 'Cannot accept quote');
    }

    if (!quote.rfqId) throw new BadRequestException('Quote.rfqId is required for accept');

    const rfq = await this.prisma.nx01Rfq.findUnique({
      where: { id: quote.rfqId },
    });
    if (!rfq) throw new BadRequestException('RFQ not found for this quote');

    // 成交意味著 RFQ 已可關閉（依你們的狀態機預期：R->C）
    try {
      if (rfq.status) assertRfqStatusTransition(rfq.status as any, 'C');
    } catch {
      // MVP 不強制：若狀態機不同就先略過（避免阻塞成交）
    }

    const poDate = parseIsoDateOrThrow(body.poDate, 'poDate');
    const soDate = parseIsoDateOrThrow(body.soDate, 'soDate');
    const warehouseId = body.warehouseId;
    const locationId = body.locationId ?? null;

    // 由 QUOTE item 推導 PO/SO items；PO 的成本用 unitCost_snapshot，SO 售價用 unitPrice_snapshot
    const items = quote.items ?? [];
    if (items.length === 0) throw new BadRequestException('Quote has no items');

    const createdBy = ctx?.actorUserId ?? null;

    const tenantId = await this.resolveTenantIdOrThrow(quote.tenantId);

    const result = await this.prisma.$transaction(async (tx) => {
      // PO
      const subtotal = items.reduce((acc: any, it: any, idx: number) => {
        const amt = it.unitCost.mul(it.qty);
        return idx === 0 ? amt : acc.add(amt);
      }, items[0].unitCost.mul(items[0].qty));

      const po = await tx.nx01Po.create({
        data: {
          docNo: body.poDocNo.trim(),
          tenantId: tenantId,
          poDate,
          supplierId: rfq.supplierId,
          rfqId: rfq.id,
          currency: quote.currency,
          subtotal,
          taxAmount: '0' as any,
          totalAmount: subtotal,
          status: 'D',
          remark: body.poRemark ?? null,
          createdBy,
          updatedBy: createdBy,
        },
      });

      await tx.nx01PoItem.createMany({
        data: items.map((it: any, idx: number) => ({
          tenantId: tenantId,
          poId: po.id,
          lineNo: idx + 1,
          partId: it.partId,
          partNo: it.partNo,
          partName: it.partName,
          warehouseId,
          locationId,
          qty: it.qty,
          unitCost: it.unitCost,
          lineAmount: it.unitCost.mul(it.qty),
          remark: null,
          createdBy,
          updatedBy: createdBy,
        })),
      });

      // SO
      const so = await tx.nx08SalesOrder.create({
        data: {
          docNo: body.soDocNo.trim(),
          tenantId: tenantId,
          soDate,
          customerId: quote.customerId,
          quoteId: quote.id,
          currency: quote.currency,
          status: 'R',
          remark: body.soRemark ?? null,
          createdBy,
          updatedBy: createdBy,
        },
      });

      await tx.nx08SalesOrderItem.createMany({
        data: items.map((it: any, idx: number) => ({
          tenantId: tenantId,
          salesOrderId: so.id,
          lineNo: idx + 1,
          quoteItemId: it.id,
          partId: it.partId,
          partNo: it.partNo,
          partName: it.partName,
          qty: it.qty,
          unitPrice: it.unitPrice,
          warehouseId,
          locationId,
          remark: null,
          createdBy,
          updatedBy: createdBy,
        })),
      });

      // update quote + rfq
      await tx.nx07Quote.update({
        where: { id: quote.id },
        data: {
          status: 'A',
          updatedBy: createdBy,
        },
      });

      await tx.nx01Rfq.update({
        where: { id: rfq.id },
        data: {
          status: 'C',
          updatedBy: createdBy,
        },
      });

      return { po, so };
    });

    if (ctx?.actorUserId) {
      await this.audit.write({
        actorUserId: ctx.actorUserId,
        moduleCode: 'NX03',
        action: 'ACCEPT',
        entityTable: 'nx07_quote',
        entityId: quote.id,
        entityCode: quote.docNo,
        summary: `Accept QUOTE ${quote.docNo} -> create PO + SO`,
        afterData: { poId: result.po.id, soId: result.so.id },
        ipAddr: ctx.ipAddr ?? null,
        userAgent: ctx.userAgent ?? null,
      });

      await this.audit.write({
        actorUserId: ctx.actorUserId,
        moduleCode: 'NX01',
        action: 'CREATE',
        entityTable: 'nx01_po',
        entityId: result.po.id,
        entityCode: result.po.docNo,
        summary: `Create PO ${result.po.docNo} from QUOTE ${quote.docNo}`,
        afterData: result.po,
        ipAddr: ctx.ipAddr ?? null,
        userAgent: ctx.userAgent ?? null,
      });

      await this.audit.write({
        actorUserId: ctx.actorUserId,
        moduleCode: 'NX03',
        action: 'CREATE',
        entityTable: 'nx08_sales_order',
        entityId: result.so.id,
        entityCode: result.so.docNo,
        summary: `Create SO ${result.so.docNo} from QUOTE ${quote.docNo}`,
        afterData: result.so,
        ipAddr: ctx.ipAddr ?? null,
        userAgent: ctx.userAgent ?? null,
      });
    }

    return {
      quoteId: quote.id,
      poId: result.po.id,
      salesOrderId: result.so.id,
      poDocNo: result.po.docNo,
      soDocNo: result.so.docNo,
    };
  }
}


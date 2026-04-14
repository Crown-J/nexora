import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { resolveCurrencyId } from '../../shared/nx02/nx02-currency';
import { allocNx04DocNo } from '../../shared/nx04/nx04-doc-no';
import { Nx04ListQueryDto } from '../../shared/nx04/nx04-list-query.dto';
import { assertQuoteStatusTransition, QuoteStatus } from '../../shared/nx04/nx04-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreateQuoteDto, CreateQuoteItemDto, PatchQuoteItemDto, UpdateQuoteDto } from './dto/quote.dto';

const Q_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  warehouseId: true,
  quoteDate: true,
  customerId: true,
  customerGradeId: true,
  validUntil: true,
  currencyId: true,
  subtotal: true,
  taxRate: true,
  taxAmount: true,
  totalAmount: true,
  status: true,
  remark: true,
  voidedAt: true,
  voidedBy: true,
  voidReason: true,
  rfqId: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

const Q_ITEM_SEL = {
  id: true,
  quoteId: true,
  lineNo: true,
  partId: true,
  partNo: true,
  partName: true,
  qty: true,
  unitPrice: true,
  lineAmount: true,
  isSelected: true,
  transferredQty: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

function mapQuoteItemApi<T extends { unitPrice: PrismaNs.Decimal | unknown }>(row: T) {
  const u = row.unitPrice as PrismaNs.Decimal;
  return { ...row, unitPriceSnapshot: u };
}

@Injectable()
export class QuoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx04ListQueryDto): Prisma.Nx04QuoteWhereInput {
    const where: Prisma.Nx04QuoteWhereInput = { tenantId, voidedAt: null };
    if (q.status?.trim()) where.status = q.status.trim();
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [{ docNo: { contains: s, mode: 'insensitive' } }, { remark: { contains: s, mode: 'insensitive' } }];
    }
    return where;
  }

  private async assertCustomerC(tx: Prisma.TransactionClient, tenantId: string, partnerId: string) {
    const p = await tx.nx01Partner.findFirst({
      where: { id: partnerId, tenantId, isActive: true, partnerType: 'C' },
      select: { id: true },
    });
    if (!p) throw new BadRequestException('customerId must be an active partner with partnerType=C');
  }

  private lineAmount(qty: PrismaNs.Decimal, unit: PrismaNs.Decimal) {
    return qty.mul(unit).toDecimalPlaces(2);
  }

  private async loadPartSnapshot(tx: Prisma.TransactionClient, tenantId: string, partId: string) {
    const p = await tx.nx01Part.findFirst({
      where: { id: partId, tenantId },
      select: { code: true, name: true },
    });
    if (!p) throw new NotFoundException(`Part ${partId} not found`);
    return { partNo: p.code, partName: p.name };
  }

  private async recalcQuoteTotals(tx: Prisma.TransactionClient, quoteId: string, taxRate: PrismaNs.Decimal) {
    const items = await tx.nx04QuoteItem.findMany({
      where: { quoteId, isSelected: true },
      select: { lineAmount: true },
    });
    let sub = new PrismaNs.Decimal(0);
    for (const it of items) sub = sub.add(it.lineAmount);
    const tax = sub.mul(taxRate).div(100).toDecimalPlaces(2);
    const total = sub.add(tax);
    await tx.nx04Quote.update({
      where: { id: quoteId },
      data: { subtotal: sub, taxAmount: tax, totalAmount: total },
    });
  }

  private assertQuoteItemsEditable(status: string) {
    if (status !== QuoteStatus.DRAFT && status !== QuoteStatus.SENT) {
      throw new BadRequestException('Quote line items are not editable in current status');
    }
  }

  private mapDetail(row: { rev_Nx04QuoteItem_quoteId: unknown[] } & Record<string, unknown>) {
    const { rev_Nx04QuoteItem_quoteId: items, ...rest } = row;
    return {
      ...rest,
      items: (items as object[]).map((it) => mapQuoteItemApi(it as never)),
    };
  }

  async list(user: RequestUser, q: Nx04ListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx04Quote.count({ where }),
      this.prisma.nx04Quote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: Q_SEL,
      }),
    ]);
    return { page, pageSize, total, items: rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx04Quote.findFirst({
      where: { id, tenantId },
      select: {
        ...Q_SEL,
        rev_Nx04QuoteItem_quoteId: { orderBy: { lineNo: 'asc' }, select: Q_ITEM_SEL },
      },
    });
    if (!row) throw new NotFoundException('Quote not found');
    return this.mapDetail(row as never);
  }

  async create(user: RequestUser, dto: CreateQuoteDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      await this.assertCustomerC(tx, tenantId, dto.customerId.trim());
      const wh = await tx.nx01Warehouse.findFirst({
        where: { id: dto.warehouseId.trim(), tenantId },
        select: { id: true, code: true },
      });
      if (!wh) throw new BadRequestException('warehouseId invalid');
      const currencyId = await resolveCurrencyId(tx, dto.currencyId);
      const taxRate = new PrismaNs.Decimal(dto.taxRate);
      const docNo = await allocNx04DocNo(tx, tenantId, 'QT', wh.code);
      const quote = await tx.nx04Quote.create({
        data: {
          tenantId,
          docNo,
          warehouseId: wh.id,
          quoteDate: new Date(dto.quoteDate),
          customerId: dto.customerId.trim(),
          customerGradeId: dto.customerGradeId?.trim() || null,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
          currencyId,
          taxRate,
          subtotal: 0,
          taxAmount: 0,
          totalAmount: 0,
          status: QuoteStatus.DRAFT,
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: Q_SEL,
      });
      let line = 1;
      if (dto.items?.length) {
        for (const it of dto.items) {
          const snap = await this.loadPartSnapshot(tx, tenantId, it.partId.trim());
          const qty = new PrismaNs.Decimal(it.qty);
          const unit = new PrismaNs.Decimal(it.unitPriceSnapshot);
          const sel = it.isSelected !== false;
          await tx.nx04QuoteItem.create({
            data: {
              quoteId: quote.id,
              lineNo: line++,
              partId: it.partId.trim(),
              partNo: snap.partNo,
              partName: snap.partName,
              qty,
              unitPrice: unit,
              lineAmount: sel ? this.lineAmount(qty, unit) : new PrismaNs.Decimal(0),
              isSelected: sel,
              remark: it.remark?.trim() || null,
              createdBy: user.sub,
              updatedBy: user.sub,
            },
          });
        }
      }
      await this.recalcQuoteTotals(tx, quote.id, taxRate);
      const full = await tx.nx04Quote.findFirst({
        where: { id: quote.id },
        select: {
          ...Q_SEL,
          rev_Nx04QuoteItem_quoteId: { orderBy: { lineNo: 'asc' }, select: Q_ITEM_SEL },
        },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX04',
        action: 'CREATE',
        entityTable: 'nx04_quote',
        entityId: quote.id,
        entityCode: quote.docNo,
        summary: '建立報價單',
        afterData: full as object,
      });
      return this.mapDetail(full as never);
    });
  }

  async update(user: RequestUser, id: string, dto: UpdateQuoteDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx04Quote.findFirst({ where: { id, tenantId }, select: Q_SEL });
    if (!existing) throw new NotFoundException('Quote not found');
    if (existing.voidedAt) throw new BadRequestException('Quote is voided');

    if (dto.status !== undefined && dto.status !== existing.status) {
      assertQuoteStatusTransition(existing.status, dto.status);
    }

    return this.prisma.$transaction(async (tx) => {
      const taxRate = new PrismaNs.Decimal(existing.taxRate);
      await tx.nx04Quote.update({
        where: { id },
        data: {
          ...(dto.quoteDate !== undefined ? { quoteDate: new Date(dto.quoteDate) } : {}),
          ...(dto.validUntil !== undefined ? { validUntil: dto.validUntil ? new Date(dto.validUntil) : null } : {}),
          ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          updatedBy: user.sub,
        },
      });
      if (dto.status !== undefined || dto.quoteDate !== undefined) {
        await this.recalcQuoteTotals(tx, id, taxRate);
      }
      const full = await tx.nx04Quote.findFirst({
        where: { id },
        select: {
          ...Q_SEL,
          rev_Nx04QuoteItem_quoteId: { orderBy: { lineNo: 'asc' }, select: Q_ITEM_SEL },
        },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX04',
        action: 'UPDATE',
        entityTable: 'nx04_quote',
        entityId: id,
        entityCode: existing.docNo,
        summary: '修改報價單',
        beforeData: existing as object,
        afterData: full as object,
      });
      return this.mapDetail(full as never);
    });
  }

  async softDelete(user: RequestUser, id: string, voidReason?: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx04Quote.findFirst({ where: { id, tenantId }, select: Q_SEL });
    if (!existing) throw new NotFoundException('Quote not found');
    if (existing.voidedAt) throw new BadRequestException('Quote already voided');
    assertQuoteStatusTransition(existing.status, QuoteStatus.CANCELLED);
    await this.prisma.nx04Quote.update({
      where: { id },
      data: {
        voidedAt: new Date(),
        voidedBy: user.sub,
        voidReason: voidReason?.trim() || 'VOID',
        status: QuoteStatus.CANCELLED,
        updatedBy: user.sub,
      },
    });
    const full = await this.prisma.nx04Quote.findFirst({
      where: { id },
      select: {
        ...Q_SEL,
        rev_Nx04QuoteItem_quoteId: { orderBy: { lineNo: 'asc' }, select: Q_ITEM_SEL },
      },
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'DELETE',
      entityTable: 'nx04_quote',
      entityId: id,
      entityCode: existing.docNo,
      summary: '作廢報價單',
      beforeData: existing as object,
      afterData: full as object,
    });
    return this.mapDetail(full as never);
  }

  async addItem(user: RequestUser, quoteId: string, dto: CreateQuoteItemDto) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx04Quote.findFirst({ where: { id: quoteId, tenantId }, select: Q_SEL });
    if (!head) throw new NotFoundException('Quote not found');
    if (head.voidedAt) throw new BadRequestException('Quote is voided');
    this.assertQuoteItemsEditable(head.status);
    const snap = await this.loadPartSnapshot(this.prisma, tenantId, dto.partId.trim());
    const maxLine = await this.prisma.nx04QuoteItem.aggregate({ where: { quoteId }, _max: { lineNo: true } });
    const lineNo = (maxLine._max.lineNo ?? 0) + 1;
    const qty = new PrismaNs.Decimal(dto.qty);
    const unit = new PrismaNs.Decimal(dto.unitPriceSnapshot);
    const sel = dto.isSelected !== false;
    const row = await this.prisma.nx04QuoteItem.create({
      data: {
        quoteId,
        lineNo,
        partId: dto.partId.trim(),
        partNo: snap.partNo,
        partName: snap.partName,
        qty,
        unitPrice: unit,
        lineAmount: sel ? this.lineAmount(qty, unit) : new PrismaNs.Decimal(0),
        isSelected: sel,
        remark: dto.remark?.trim() || null,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: Q_ITEM_SEL,
    });
    await this.recalcQuoteTotals(this.prisma, quoteId, new PrismaNs.Decimal(head.taxRate));
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'CREATE',
      entityTable: 'nx04_quote_item',
      entityId: row.id,
      entityCode: head.docNo,
      summary: '新增報價明細',
      afterData: mapQuoteItemApi(row) as object,
    });
    return mapQuoteItemApi(row);
  }

  async patchItem(user: RequestUser, quoteId: string, itemId: string, dto: PatchQuoteItemDto) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx04Quote.findFirst({ where: { id: quoteId, tenantId }, select: Q_SEL });
    if (!head) throw new NotFoundException('Quote not found');
    if (head.voidedAt) throw new BadRequestException('Quote is voided');
    this.assertQuoteItemsEditable(head.status);
    const existing = await this.prisma.nx04QuoteItem.findFirst({ where: { id: itemId, quoteId }, select: Q_ITEM_SEL });
    if (!existing) throw new NotFoundException('Quote item not found');
    const qty = dto.qty !== undefined ? new PrismaNs.Decimal(dto.qty) : new PrismaNs.Decimal(existing.qty);
    const unit =
      dto.unitPriceSnapshot !== undefined
        ? new PrismaNs.Decimal(dto.unitPriceSnapshot)
        : new PrismaNs.Decimal(existing.unitPrice);
    const sel = dto.isSelected !== undefined ? dto.isSelected : existing.isSelected;
    const lineAmount = sel ? this.lineAmount(qty, unit) : new PrismaNs.Decimal(0);
    const row = await this.prisma.nx04QuoteItem.update({
      where: { id: itemId },
      data: {
        qty,
        unitPrice: unit,
        lineAmount,
        ...(dto.isSelected !== undefined ? { isSelected: dto.isSelected } : {}),
        ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
        updatedBy: user.sub,
      },
      select: Q_ITEM_SEL,
    });
    await this.recalcQuoteTotals(this.prisma, quoteId, new PrismaNs.Decimal(head.taxRate));
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'UPDATE',
      entityTable: 'nx04_quote_item',
      entityId: itemId,
      entityCode: head.docNo,
      summary: '修改報價明細',
      beforeData: mapQuoteItemApi(existing) as object,
      afterData: mapQuoteItemApi(row) as object,
    });
    return mapQuoteItemApi(row);
  }

  async removeItem(user: RequestUser, quoteId: string, itemId: string) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx04Quote.findFirst({ where: { id: quoteId, tenantId }, select: Q_SEL });
    if (!head) throw new NotFoundException('Quote not found');
    if (head.voidedAt) throw new BadRequestException('Quote is voided');
    this.assertQuoteItemsEditable(head.status);
    const existing = await this.prisma.nx04QuoteItem.findFirst({ where: { id: itemId, quoteId }, select: Q_ITEM_SEL });
    if (!existing) throw new NotFoundException('Quote item not found');
    await this.prisma.nx04QuoteItem.delete({ where: { id: itemId } });
    await this.recalcQuoteTotals(this.prisma, quoteId, new PrismaNs.Decimal(head.taxRate));
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'DELETE',
      entityTable: 'nx04_quote_item',
      entityId: itemId,
      entityCode: head.docNo,
      summary: '刪除報價明細',
      beforeData: mapQuoteItemApi(existing) as object,
    });
    return { ok: true };
  }
}

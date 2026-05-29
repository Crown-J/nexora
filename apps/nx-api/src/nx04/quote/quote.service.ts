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
  groupNo: true,
  partId: true,
  partNo: true,
  partName: true,
  qty: true,
  unitPrice: true,
  minPrice: true,
  discountCodeId: true,
  lineAmount: true,
  isSelected: true,
  belowMinReason: true,
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

  /**
   * Quote 列表 query
   * NX04-IMPL-01 Phase 3 commit 3b：對齊 Crown Q9 純記錄 + 多業務員共享
   *   - tenant-wide 列表（不按 createdBy 過濾、業務員 A 可看業務員 B 的報價歷史）
   *   - 純記錄 / 不簽核（既有 status DRAFT→SENT→ACCEPTED 業務員自行標、無系統強制簽核）
   *   - search 擴：docNo / remark / customer.code/name / 任一 item.partNo/partName
   */
  private whereList(tenantId: string, q: Nx04ListQueryDto): Prisma.Nx04QuoteWhereInput {
    const where: Prisma.Nx04QuoteWhereInput = { tenantId, voidedAt: null };
    if (q.status?.trim()) where.status = q.status.trim();
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { docNo: { contains: s, mode: 'insensitive' } },
        { remark: { contains: s, mode: 'insensitive' } },
        { customer: { code: { contains: s, mode: 'insensitive' } } },
        { customer: { name: { contains: s, mode: 'insensitive' } } },
        { rev_Nx04QuoteItem_quoteId: { some: { partNo: { contains: s, mode: 'insensitive' } } } },
        { rev_Nx04QuoteItem_quoteId: { some: { partName: { contains: s, mode: 'insensitive' } } } },
      ];
    }
    return where;
  }

  private async assertCustomerC(tx: Prisma.TransactionClient, tenantId: string, partnerId: string) {
    const p = await tx.nx01Partner.findFirst({
      where: { id: partnerId, tenantId, isActive: true, partnerType: { in: ['C', 'O'] } },
      select: { id: true },
    });
    if (!p) throw new BadRequestException("customerId must be an active partner with partnerType IN ('C', 'O')");
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

  /**
   * 計算最低售價（NX04-M2 §A C1 毛利警告基準）
   * minPrice = avgCost × (1 + marginPct/100)
   * 沒有 customerGradeId → 不警告（return null）
   * 沒有 stock_balance 或 avgCost=0 → 不警告（料件還沒進過貨）
   */
  private async computeMinPrice(
    tx: Prisma.TransactionClient,
    tenantId: string,
    partId: string,
    warehouseId: string,
    customerGradeId: string | null,
  ): Promise<PrismaNs.Decimal | null> {
    if (!customerGradeId) return null;
    const grade = await tx.nx01CustomerGrade.findFirst({
      where: { id: customerGradeId, tenantId },
      select: { marginPct: true },
    });
    if (!grade) return null;
    const bal = await tx.nx03StockBalance.findFirst({
      where: { tenantId, partId, warehouseId },
      select: { avgCost: true },
    });
    if (!bal) return null;
    const avgCost = new PrismaNs.Decimal(bal.avgCost);
    if (avgCost.lte(0)) return null;
    const marginPct = new PrismaNs.Decimal(grade.marginPct);
    return avgCost.mul(marginPct.div(100).add(1)).toDecimalPlaces(4);
  }

  /**
   * 毛利警告驗證（NX04-M2 §A C1）
   * unitPrice < minPrice → require belowMinReason
   * 不擋業務、只強制填理由
   */
  private assertMinPriceReason(
    unitPrice: PrismaNs.Decimal,
    minPrice: PrismaNs.Decimal | null,
    belowMinReason: string | null | undefined,
  ): void {
    if (!minPrice) return;
    if (unitPrice.gte(minPrice)) return;
    if (!belowMinReason?.trim()) {
      throw new BadRequestException(
        `unitPrice (${unitPrice.toString()}) below minPrice (${minPrice.toString()}); belowMinReason required`,
      );
    }
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
          const minPrice = await this.computeMinPrice(
            tx,
            tenantId,
            it.partId.trim(),
            wh.id,
            dto.customerGradeId?.trim() || null,
          );
          this.assertMinPriceReason(unit, minPrice, it.belowMinReason);
          await tx.nx04QuoteItem.create({
            data: {
              quoteId: quote.id,
              lineNo: line++,
              partId: it.partId.trim(),
              partNo: snap.partNo,
              partName: snap.partName,
              qty,
              unitPrice: unit,
              minPrice: minPrice ?? null,
              belowMinReason: it.belowMinReason?.trim() || null,
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
    const minPrice = await this.computeMinPrice(
      this.prisma,
      tenantId,
      dto.partId.trim(),
      head.warehouseId,
      head.customerGradeId,
    );
    this.assertMinPriceReason(unit, minPrice, dto.belowMinReason);
    const row = await this.prisma.nx04QuoteItem.create({
      data: {
        quoteId,
        lineNo,
        partId: dto.partId.trim(),
        partNo: snap.partNo,
        partName: snap.partName,
        qty,
        unitPrice: unit,
        minPrice: minPrice ?? null,
        belowMinReason: dto.belowMinReason?.trim() || null,
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
    const minPrice =
      dto.unitPriceSnapshot !== undefined
        ? await this.computeMinPrice(this.prisma, tenantId, existing.partId, head.warehouseId, head.customerGradeId)
        : existing.minPrice
        ? new PrismaNs.Decimal(existing.minPrice)
        : null;
    const effectiveBelowMinReason = dto.belowMinReason ?? existing.belowMinReason ?? undefined;
    if (dto.unitPriceSnapshot !== undefined) {
      this.assertMinPriceReason(unit, minPrice, effectiveBelowMinReason);
    }
    const row = await this.prisma.nx04QuoteItem.update({
      where: { id: itemId },
      data: {
        qty,
        unitPrice: unit,
        lineAmount,
        ...(dto.unitPriceSnapshot !== undefined ? { minPrice } : {}),
        ...(dto.belowMinReason !== undefined ? { belowMinReason: dto.belowMinReason?.trim() || null } : {}),
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

  /**
   * 歷史價查詢（NX04-M2 §A C1）
   * 給 UI 加料件行時顯示「該客戶上次報過 / 買過此料件的價格 + 時間」
   * 範圍：同 tenantId + customerId + partId + quote 未作廢 + 不限 status
   * 回傳：最近 limit 筆（預設 5）
   */
  async getHistoricalPrices(
    user: RequestUser,
    customerId: string,
    partId: string,
    limit?: number,
  ) {
    const tenantId = requireTenantId(user);
    const take = Math.min(Math.max(limit ?? 5, 1), 20);
    const rows = await this.prisma.nx04QuoteItem.findMany({
      where: {
        partId,
        quote: { tenantId, customerId, voidedAt: null },
      },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        unitPrice: true,
        qty: true,
        minPrice: true,
        belowMinReason: true,
        createdAt: true,
        quote: {
          select: { id: true, docNo: true, quoteDate: true, status: true },
        },
      },
    });
    return rows.map((r) => ({
      quoteItemId: r.id,
      quoteId: r.quote.id,
      docNo: r.quote.docNo,
      quoteDate: r.quote.quoteDate,
      status: r.quote.status,
      unitPrice: r.unitPrice,
      qty: r.qty,
      minPrice: r.minPrice,
      belowMinReason: r.belowMinReason,
      createdAt: r.createdAt,
    }));
  }

  /**
   * SO 拉報價後的 cascade 副作用（NX04-M2 §A C1 採用後失效機制、commit 2 SO 串接）
   *
   * 動作 1：被 SO 拉走的 quote（adoptedQuoteIds）若所有 isSelected line 都 transferredQty>=qty
   *         → quote.status = ACCEPTED（語意 ADOPTED）
   *
   * 動作 2：同客戶其他舊 quote（excluding adoptedQuoteIds）含相同 partId 的 line、
   *         status IN (DRAFT, SENT)、未作廢、未耗盡 →
   *         該 line transferredQty = qty 標記耗盡
   *         若整張 quote 的 isSelected line 都耗盡 → quote.status = CANCELLED（語意 REPLACED）
   *
   * 不寫 audit log：cascade 是 SO 觸發的副作用、SO commit 2 一起寫 audit。
   */
  async cascadeOnSoAdopt(
    tx: Prisma.TransactionClient,
    tenantId: string,
    customerId: string,
    adoptedQuoteIds: string[],
    adoptedPartIds: string[],
    userId: string,
  ): Promise<void> {
    // === 1. 被拉走的 quote 若耗盡 → ACCEPTED ===
    for (const aid of adoptedQuoteIds) {
      const items = await tx.nx04QuoteItem.findMany({
        where: { quoteId: aid, isSelected: true },
        select: { qty: true, transferredQty: true },
      });
      if (!items.length) continue;
      const allExhausted = items.every((it) =>
        new PrismaNs.Decimal(it.transferredQty).gte(new PrismaNs.Decimal(it.qty)),
      );
      if (!allExhausted) continue;
      const q = await tx.nx04Quote.findUnique({ where: { id: aid }, select: { status: true } });
      if (q && (q.status === QuoteStatus.DRAFT || q.status === QuoteStatus.SENT)) {
        await tx.nx04Quote.update({
          where: { id: aid },
          data: { status: QuoteStatus.ACCEPTED, updatedBy: userId },
        });
      }
    }

    // === 2. 同客戶舊 QT 同料件 line 失效 ===
    if (!adoptedPartIds.length) return;
    const candidates = await tx.nx04QuoteItem.findMany({
      where: {
        partId: { in: adoptedPartIds },
        quoteId: { notIn: adoptedQuoteIds },
        quote: {
          tenantId,
          customerId,
          status: { in: [QuoteStatus.DRAFT, QuoteStatus.SENT] },
          voidedAt: null,
        },
      },
      select: { id: true, quoteId: true, qty: true, transferredQty: true },
    });
    for (const c of candidates) {
      const qty = new PrismaNs.Decimal(c.qty);
      const transferred = new PrismaNs.Decimal(c.transferredQty);
      if (transferred.gte(qty)) continue;
      await tx.nx04QuoteItem.update({
        where: { id: c.id },
        data: { transferredQty: qty, updatedBy: userId },
      });
    }
    const affectedQuoteIds = Array.from(new Set(candidates.map((c) => c.quoteId)));
    for (const qid of affectedQuoteIds) {
      const items = await tx.nx04QuoteItem.findMany({
        where: { quoteId: qid, isSelected: true },
        select: { qty: true, transferredQty: true },
      });
      if (!items.length) continue;
      const allExhausted = items.every((it) =>
        new PrismaNs.Decimal(it.transferredQty).gte(new PrismaNs.Decimal(it.qty)),
      );
      if (!allExhausted) continue;
      const q = await tx.nx04Quote.findUnique({ where: { id: qid }, select: { status: true } });
      if (q && (q.status === QuoteStatus.DRAFT || q.status === QuoteStatus.SENT)) {
        await tx.nx04Quote.update({
          where: { id: qid },
          data: { status: QuoteStatus.CANCELLED, updatedBy: userId },
        });
      }
    }
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

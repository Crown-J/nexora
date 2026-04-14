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
import { requireDefaultLocationId } from '../../shared/nx04/nx04-location';
import { Nx04ListQueryDto } from '../../shared/nx04/nx04-list-query.dto';
import {
  assertSoStatusTransition,
  QuoteStatus,
  SoStatus,
} from '../../shared/nx04/nx04-state-machine';
import { applyQtyOutWithLedger } from '../../shared/nx03/nx03-inventory';
import { createArFromShippedSo } from '../../shared/nx05/nx05-create-ar-from-so';
import { createDeliveryDnFromShippedSo } from '../../shared/nx06/nx06-create-delivery-from-so';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreateSoDto, CreateSoItemDto, PatchSoItemDto, UpdateSoDto } from './dto/so.dto';

const SO_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  warehouseId: true,
  soDate: true,
  customerId: true,
  quoteId: true,
  deliveryType: true,
  deliveryAddress: true,
  sourceType: true,
  currencyId: true,
  subtotal: true,
  taxRate: true,
  taxAmount: true,
  totalAmount: true,
  status: true,
  paymentTerm: true,
  remark: true,
  cancelledAt: true,
  cancelledBy: true,
  cancelReason: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

const SO_ITEM_SEL = {
  id: true,
  soId: true,
  quoteItemId: true,
  lineNo: true,
  partId: true,
  partNo: true,
  partName: true,
  warehouseId: true,
  locationId: true,
  qty: true,
  unitPrice: true,
  lineAmount: true,
  reservedQty: true,
  remark: true,
  itemStatus: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

const Q_ITEM_MIN = {
  id: true,
  quoteId: true,
  lineNo: true,
  partId: true,
  partNo: true,
  partName: true,
  qty: true,
  unitPrice: true,
  transferredQty: true,
  isSelected: true,
} as const;

function mapSoItemApi<T extends { unitPrice: PrismaNs.Decimal | unknown }>(row: T) {
  const u = row.unitPrice as PrismaNs.Decimal;
  return { ...row, unitPriceSnapshot: u };
}

@Injectable()
export class SoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx04ListQueryDto): Prisma.Nx04SoWhereInput {
    const where: Prisma.Nx04SoWhereInput = { tenantId, cancelledAt: null };
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
      select: { id: true, paymentTermDomestic: true },
    });
    if (!p) throw new BadRequestException('customerId must be an active partner with partnerType=C');
    return p.paymentTermDomestic;
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

  private async recalcSoTotals(tx: Prisma.TransactionClient, soId: string, taxRate: PrismaNs.Decimal) {
    const items = await tx.nx04SoItem.findMany({
      where: { soId },
      select: { lineAmount: true },
    });
    let sub = new PrismaNs.Decimal(0);
    for (const it of items) sub = sub.add(it.lineAmount);
    const tax = sub.mul(taxRate).div(100).toDecimalPlaces(2);
    const total = sub.add(tax);
    await tx.nx04So.update({
      where: { id: soId },
      data: { subtotal: sub, taxAmount: tax, totalAmount: total },
    });
  }

  private assertSoItemsEditable(status: string) {
    if (status !== SoStatus.DRAFT && status !== SoStatus.CONFIRMED && status !== SoStatus.PICKING) {
      throw new BadRequestException('SO line items are not editable in current status');
    }
  }

  private mapDetail(row: { rev_Nx04SoItem_soId: unknown[] } & Record<string, unknown>) {
    const { rev_Nx04SoItem_soId: items, ...rest } = row;
    return {
      ...rest,
      items: (items as object[]).map((it) => mapSoItemApi(it as never)),
    };
  }

  private async applySoShipping(
    tx: Prisma.TransactionClient,
    so: { id: string; tenantId: string },
    userId: string,
  ) {
    const items = await tx.nx04SoItem.findMany({
      where: { soId: so.id },
      select: { ...SO_ITEM_SEL },
    });
    if (!items.length) throw new BadRequestException('SO has no items to ship');
    for (const item of items) {
      const qtyOut = new PrismaNs.Decimal(String(item.qty));
      if (!qtyOut.gt(0)) continue;
      const locId =
        item.locationId?.trim() ||
        (await requireDefaultLocationId(tx, so.tenantId, item.warehouseId));
      await applyQtyOutWithLedger(tx, {
        tenantId: so.tenantId,
        userId,
        partId: item.partId,
        warehouseId: item.warehouseId,
        locationId: locId,
        qtyOut,
        sourceModule: 'NX04',
        sourceDocType: 'S',
        sourceDocId: so.id,
        sourceItemId: item.id,
      });
    }
  }

  async list(user: RequestUser, q: Nx04ListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx04So.count({ where }),
      this.prisma.nx04So.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: SO_SEL,
      }),
    ]);
    return { page, pageSize, total, items: rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx04So.findFirst({
      where: { id, tenantId },
      select: {
        ...SO_SEL,
        rev_Nx04SoItem_soId: { orderBy: { lineNo: 'asc' }, select: SO_ITEM_SEL },
      },
    });
    if (!row) throw new NotFoundException('SO not found');
    return this.mapDetail(row as never);
  }

  async create(user: RequestUser, dto: CreateSoDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const paymentTerm = await this.assertCustomerC(tx, tenantId, dto.customerId.trim());
      const wh = await tx.nx01Warehouse.findFirst({
        where: { id: dto.warehouseId.trim(), tenantId },
        select: { id: true, code: true },
      });
      if (!wh) throw new BadRequestException('warehouseId invalid');
      const currencyId = await resolveCurrencyId(tx, dto.currencyId);
      const taxRate = new PrismaNs.Decimal(dto.taxRate);
      const docNo = await allocNx04DocNo(tx, tenantId, 'SO', wh.code);
      const so = await tx.nx04So.create({
        data: {
          tenantId,
          docNo,
          warehouseId: wh.id,
          soDate: new Date(dto.soDate),
          customerId: dto.customerId.trim(),
          quoteId: dto.quoteId?.trim() || null,
          deliveryType: dto.deliveryType.trim(),
          sourceType: 'S',
          currencyId,
          taxRate,
          subtotal: 0,
          taxAmount: 0,
          totalAmount: 0,
          status: SoStatus.DRAFT,
          paymentTerm,
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: SO_SEL,
      });
      let line = 1;
      if (dto.items?.length) {
        for (const it of dto.items) {
          await this.createSoItemTx(tx, user, so.id, line++, it);
        }
      }
      await this.recalcSoTotals(tx, so.id, taxRate);
      const full = await tx.nx04So.findFirst({
        where: { id: so.id },
        select: {
          ...SO_SEL,
          rev_Nx04SoItem_soId: { orderBy: { lineNo: 'asc' }, select: SO_ITEM_SEL },
        },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX04',
        action: 'CREATE',
        entityTable: 'nx04_so',
        entityId: so.id,
        entityCode: so.docNo,
        summary: '建立銷貨單',
        afterData: full as object,
      });
      return this.mapDetail(full as never);
    });
  }

  private async createSoItemTx(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    soId: string,
    lineNo: number,
    it: CreateSoItemDto,
  ) {
    const tenantId = requireTenantId(user);
    const whId = it.warehouseId.trim();
    const locId = it.locationId?.trim() || (await requireDefaultLocationId(tx, tenantId, whId));
    const loc = await tx.nx01Location.findFirst({
      where: { id: locId, tenantId, warehouseId: whId },
      select: { id: true },
    });
    if (!loc) throw new BadRequestException('locationId must belong to item warehouse');
    const snap = await this.loadPartSnapshot(tx, tenantId, it.partId.trim());
    const qty = new PrismaNs.Decimal(it.qty);
    const unit = new PrismaNs.Decimal(it.unitPriceSnapshot);
    await tx.nx04SoItem.create({
      data: {
        soId,
        lineNo,
        quoteItemId: it.quoteItemId?.trim() || null,
        partId: it.partId.trim(),
        partNo: snap.partNo,
        partName: snap.partName,
        warehouseId: whId,
        locationId: locId,
        qty,
        unitPrice: unit,
        lineAmount: this.lineAmount(qty, unit),
        reservedQty: new PrismaNs.Decimal(0),
        belowMinReason: it.belowMinReason?.trim() || null,
        remark: it.remark?.trim() || null,
        itemStatus: 'WP',
        createdBy: user.sub,
        updatedBy: user.sub,
      },
    });
  }

  async createFromQuote(user: RequestUser, quoteId: string) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const q = await tx.nx04Quote.findFirst({
        where: { id: quoteId, tenantId, voidedAt: null },
        select: {
          ...{
            id: true,
            warehouseId: true,
            customerId: true,
            currencyId: true,
            taxRate: true,
            status: true,
            validUntil: true,
          },
          rev_Nx04QuoteItem_quoteId: { orderBy: { lineNo: 'asc' }, select: Q_ITEM_MIN },
        },
      });
      if (!q) throw new NotFoundException('Quote not found');
      if (q.status !== QuoteStatus.SENT && q.status !== QuoteStatus.ACCEPTED) {
        throw new BadRequestException('Quote must be SENT or ACCEPTED to convert to SO');
      }
      if (q.validUntil) {
        const vu = new Date(q.validUntil);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (vu < today) throw new BadRequestException('Quote has expired (validUntil)');
      }
      const paymentTerm = await this.assertCustomerC(tx, tenantId, q.customerId);
      const wh = await tx.nx01Warehouse.findFirst({
        where: { id: q.warehouseId, tenantId },
        select: { code: true },
      });
      if (!wh) throw new BadRequestException('Quote warehouse invalid');
      const docNo = await allocNx04DocNo(tx, tenantId, 'SO', wh.code);
      const so = await tx.nx04So.create({
        data: {
          tenantId,
          docNo,
          warehouseId: q.warehouseId,
          soDate: new Date(),
          customerId: q.customerId,
          quoteId: q.id,
          deliveryType: 'P',
          sourceType: 'S',
          currencyId: q.currencyId,
          taxRate: q.taxRate,
          subtotal: 0,
          taxAmount: 0,
          totalAmount: 0,
          status: SoStatus.DRAFT,
          paymentTerm,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: SO_SEL,
      });
      const items = q.rev_Nx04QuoteItem_quoteId.filter((i) => i.isSelected);
      let lineNo = 1;
      let anyLine = false;
      for (const qi of items) {
        const remain = new PrismaNs.Decimal(qi.qty).sub(new PrismaNs.Decimal(qi.transferredQty));
        if (remain.lte(0)) continue;
        anyLine = true;
        const locId = await requireDefaultLocationId(tx, tenantId, q.warehouseId);
        await tx.nx04SoItem.create({
          data: {
            soId: so.id,
            lineNo: lineNo++,
            quoteItemId: qi.id,
            partId: qi.partId,
            partNo: qi.partNo,
            partName: qi.partName,
            warehouseId: q.warehouseId,
            locationId: locId,
            qty: remain,
            unitPrice: new PrismaNs.Decimal(qi.unitPrice),
            lineAmount: this.lineAmount(remain, new PrismaNs.Decimal(qi.unitPrice)),
            reservedQty: new PrismaNs.Decimal(0),
            itemStatus: 'WP',
            createdBy: user.sub,
            updatedBy: user.sub,
          },
        });
        const newTq = new PrismaNs.Decimal(qi.transferredQty).add(remain);
        await tx.nx04QuoteItem.update({
          where: { id: qi.id },
          data: { transferredQty: newTq, updatedBy: user.sub },
        });
      }
      if (!anyLine) throw new BadRequestException('No remaining qty on selected quote lines to transfer');
      await this.recalcSoTotals(tx, so.id, new PrismaNs.Decimal(String(q.taxRate)));
      const full = await tx.nx04So.findFirst({
        where: { id: so.id },
        select: {
          ...SO_SEL,
          rev_Nx04SoItem_soId: { orderBy: { lineNo: 'asc' }, select: SO_ITEM_SEL },
        },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX04',
        action: 'CREATE',
        entityTable: 'nx04_so',
        entityId: so.id,
        entityCode: so.docNo,
        summary: '由報價單建立銷貨單',
        afterData: full as object,
      });
      return this.mapDetail(full as never);
    });
  }

  async update(user: RequestUser, id: string, dto: UpdateSoDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx04So.findFirst({ where: { id, tenantId }, select: SO_SEL });
    if (!existing) throw new NotFoundException('SO not found');
    if (existing.cancelledAt) throw new BadRequestException('SO is cancelled');

    if (dto.status !== undefined && dto.status !== existing.status) {
      assertSoStatusTransition(existing.status, dto.status);
    }
    if (dto.status === SoStatus.CANCELLED && !dto.cancelReason?.trim()) {
      throw new BadRequestException('cancelReason is required when cancelling SO');
    }

    const deliveryPatch =
      dto.deliveryType !== undefined || dto.deliveryAddress !== undefined ? true : false;
    if (deliveryPatch) {
      if (
        existing.status === SoStatus.SHIPPED ||
        existing.status === SoStatus.INVOICED ||
        existing.status === SoStatus.CANCELLED
      ) {
        throw new BadRequestException('Cannot change delivery fields after ship/cancel');
      }
      const nextType = (dto.deliveryType ?? existing.deliveryType).trim();
      const nextAddr =
        dto.deliveryAddress !== undefined
          ? dto.deliveryAddress?.trim() || null
          : (existing.deliveryAddress as string | null);
      if (nextType === 'D' && !nextAddr?.trim()) {
        throw new BadRequestException('deliveryAddress is required when deliveryType is D');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const taxRate = new PrismaNs.Decimal(String(existing.taxRate));
      const headBefore = await tx.nx04So.findFirst({
        where: { id, tenantId },
        select: { id: true, tenantId: true, status: true },
      });
      if (!headBefore) throw new NotFoundException('SO not found');
      if (dto.status === SoStatus.SHIPPED && headBefore.status === SoStatus.PICKING) {
        await this.applySoShipping(tx, { id: headBefore.id, tenantId: headBefore.tenantId }, user.sub);
      }
      await tx.nx04So.update({
        where: { id },
        data: {
          ...(dto.soDate !== undefined ? { soDate: new Date(dto.soDate) } : {}),
          ...(dto.remark !== undefined ? { remark: dto.remark?.trim() || null } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.deliveryType !== undefined ? { deliveryType: dto.deliveryType.trim() } : {}),
          ...(dto.deliveryAddress !== undefined
            ? { deliveryAddress: dto.deliveryAddress?.trim() || null }
            : {}),
          ...(dto.status === SoStatus.CANCELLED
            ? {
                cancelledAt: new Date(),
                cancelledBy: user.sub,
                cancelReason: dto.cancelReason!.trim(),
              }
            : {}),
          updatedBy: user.sub,
        },
      });
      if (dto.status === SoStatus.SHIPPED && headBefore.status === SoStatus.PICKING) {
        await createArFromShippedSo(tx, { tenantId, soId: id, userId: user.sub });
        await createDeliveryDnFromShippedSo(tx, { tenantId, soId: id, userId: user.sub });
      }
      const full = await tx.nx04So.findFirst({
        where: { id },
        select: {
          ...SO_SEL,
          rev_Nx04SoItem_soId: { orderBy: { lineNo: 'asc' }, select: SO_ITEM_SEL },
        },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX04',
        action: dto.status === SoStatus.SHIPPED ? 'POST' : 'UPDATE',
        entityTable: 'nx04_so',
        entityId: id,
        entityCode: existing.docNo,
        summary: dto.status === SoStatus.SHIPPED ? '銷貨出庫(SHIPPED)' : '修改銷貨單',
        beforeData: existing as object,
        afterData: full as object,
      });
      return this.mapDetail(full as never);
    });
  }

  async softDelete(user: RequestUser, id: string, cancelReason?: string) {
    return this.update(user, id, {
      status: SoStatus.CANCELLED,
      cancelReason: cancelReason?.trim() || 'VOID',
    });
  }

  async addItem(user: RequestUser, soId: string, dto: CreateSoItemDto) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx04So.findFirst({ where: { id: soId, tenantId }, select: SO_SEL });
    if (!head) throw new NotFoundException('SO not found');
    if (head.cancelledAt) throw new BadRequestException('SO is cancelled');
    this.assertSoItemsEditable(head.status);
    const maxLine = await this.prisma.nx04SoItem.aggregate({ where: { soId }, _max: { lineNo: true } });
    const lineNo = (maxLine._max.lineNo ?? 0) + 1;
    await this.prisma.$transaction(async (tx) => {
      await this.createSoItemTx(tx, user, soId, lineNo, dto);
      await this.recalcSoTotals(tx, soId, new PrismaNs.Decimal(String(head.taxRate)));
    });
    const row = await this.prisma.nx04SoItem.findFirst({
      where: { soId, lineNo },
      select: SO_ITEM_SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'CREATE',
      entityTable: 'nx04_so_item',
      entityId: row!.id,
      entityCode: head.docNo,
      summary: '新增銷貨明細',
      afterData: mapSoItemApi(row!) as object,
    });
    return mapSoItemApi(row!);
  }

  async patchItem(user: RequestUser, soId: string, itemId: string, dto: PatchSoItemDto) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx04So.findFirst({ where: { id: soId, tenantId }, select: SO_SEL });
    if (!head) throw new NotFoundException('SO not found');
    if (head.cancelledAt) throw new BadRequestException('SO is cancelled');
    this.assertSoItemsEditable(head.status);
    const existing = await this.prisma.nx04SoItem.findFirst({ where: { id: itemId, soId }, select: SO_ITEM_SEL });
    if (!existing) throw new NotFoundException('SO item not found');
    if (dto.locationId !== undefined) {
      const loc = await this.prisma.nx01Location.findFirst({
        where: { id: dto.locationId.trim(), tenantId, warehouseId: existing.warehouseId },
        select: { id: true },
      });
      if (!loc) throw new BadRequestException('locationId must belong to item warehouse');
    }
    const qty = dto.qty !== undefined ? new PrismaNs.Decimal(dto.qty) : new PrismaNs.Decimal(existing.qty);
    const unit =
      dto.unitPriceSnapshot !== undefined
        ? new PrismaNs.Decimal(dto.unitPriceSnapshot)
        : new PrismaNs.Decimal(existing.unitPrice);
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.nx04SoItem.update({
        where: { id: itemId },
        data: {
          ...(dto.locationId !== undefined ? { locationId: dto.locationId.trim() } : {}),
          qty,
          unitPrice: unit,
          lineAmount: this.lineAmount(qty, unit),
          ...(dto.remark !== undefined ? { remark: dto.remark?.trim() || null } : {}),
          updatedBy: user.sub,
        },
        select: SO_ITEM_SEL,
      });
      await this.recalcSoTotals(tx, soId, new PrismaNs.Decimal(String(head.taxRate)));
      return updated;
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'UPDATE',
      entityTable: 'nx04_so_item',
      entityId: itemId,
      entityCode: head.docNo,
      summary: '修改銷貨明細',
      beforeData: mapSoItemApi(existing) as object,
      afterData: mapSoItemApi(row) as object,
    });
    return mapSoItemApi(row);
  }

  async removeItem(user: RequestUser, soId: string, itemId: string) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx04So.findFirst({ where: { id: soId, tenantId }, select: SO_SEL });
    if (!head) throw new NotFoundException('SO not found');
    if (head.cancelledAt) throw new BadRequestException('SO is cancelled');
    this.assertSoItemsEditable(head.status);
    const existing = await this.prisma.nx04SoItem.findFirst({ where: { id: itemId, soId }, select: SO_ITEM_SEL });
    if (!existing) throw new NotFoundException('SO item not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.nx04SoItem.delete({ where: { id: itemId } });
      await this.recalcSoTotals(tx, soId, new PrismaNs.Decimal(String(head.taxRate)));
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'DELETE',
      entityTable: 'nx04_so_item',
      entityId: itemId,
      entityCode: head.docNo,
      summary: '刪除銷貨明細',
      beforeData: mapSoItemApi(existing) as object,
    });
    return { ok: true };
  }
}

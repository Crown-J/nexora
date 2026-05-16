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
import { applyQtyInWithLedger } from '../../shared/nx03/nx03-inventory';
import { allocNx04DocNo } from '../../shared/nx04/nx04-doc-no';
import { requireDefaultLocationId } from '../../shared/nx04/nx04-location';
import { Nx04ListQueryDto } from '../../shared/nx04/nx04-list-query.dto';
import {
  assertSalesReturnStatusTransition,
  SalesReturnStatus,
  SoStatus,
} from '../../shared/nx04/nx04-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  CreateSalesReturnDto,
  CreateSalesReturnItemDto,
  PatchSalesReturnItemDto,
  UpdateSalesReturnDto,
} from './dto/sales-return.dto';

const SR_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  warehouseId: true,
  srDate: true,
  customerId: true,
  soId: true,
  returnMethod: true,
  status: true,
  subtotal: true,
  taxRate: true,
  taxAmount: true,
  totalAmount: true,
  approvedAt: true,
  approvedBy: true,
  rejectReason: true,
  receivedAt: true,
  receivedBy: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

const SR_ITEM_SEL = {
  id: true,
  srId: true,
  soItemId: true,
  lineNo: true,
  partId: true,
  partNo: true,
  partName: true,
  returnPolicy: true,
  returnType: true,
  returnReason: true,
  concessionReason: true,
  qty: true,
  unitPrice: true,
  lineAmount: true,
  locationId: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

function mapSrItemApi<T extends { unitPrice: PrismaNs.Decimal | unknown }>(row: T) {
  const u = row.unitPrice as PrismaNs.Decimal;
  return { ...row, unitPriceSnapshot: u };
}

@Injectable()
export class SalesReturnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx04ListQueryDto): Prisma.Nx04SrWhereInput {
    const where: Prisma.Nx04SrWhereInput = { tenantId };
    if (q.status?.trim()) where.status = q.status.trim();
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [{ docNo: { contains: s, mode: 'insensitive' } }, { remark: { contains: s, mode: 'insensitive' } }];
    }
    return where;
  }

  private mapDetail(row: { rev_Nx04SrItem_srId: unknown[] } & Record<string, unknown>) {
    const { rev_Nx04SrItem_srId: items, ...rest } = row;
    return {
      ...rest,
      items: (items as object[]).map((it) => mapSrItemApi(it as never)),
    };
  }

  private lineAmount(qty: PrismaNs.Decimal, unit: PrismaNs.Decimal) {
    return qty.mul(unit).toDecimalPlaces(2);
  }

  private assertSrItemsEditable(status: string) {
    if (status !== SalesReturnStatus.DRAFT && status !== SalesReturnStatus.INSPECTING) {
      throw new BadRequestException('Sales return line items are not editable in current status');
    }
  }

  private async sumReturnedElsewhere(
    tx: Prisma.TransactionClient,
    tenantId: string,
    soItemId: string,
    excludeSrItemId?: string,
  ) {
    const agg = await tx.nx04SrItem.aggregate({
      where: {
        soItemId,
        ...(excludeSrItemId ? { id: { not: excludeSrItemId } } : {}),
        sr: {
          tenantId,
          status: { notIn: [SalesReturnStatus.CANCELLED, SalesReturnStatus.REJECTED] },
        },
      },
      _sum: { qty: true },
    });
    return agg._sum.qty ? new PrismaNs.Decimal(agg._sum.qty) : new PrismaNs.Decimal(0);
  }

  private async validateReturnQty(
    tx: Prisma.TransactionClient,
    tenantId: string,
    soItemId: string,
    qty: PrismaNs.Decimal,
    excludeSrItemId?: string,
    sameBatchPriorQty?: PrismaNs.Decimal,
  ) {
    const soItem = await tx.nx04SoItem.findFirst({
      where: { id: soItemId, so: { tenantId } },
      select: { qty: true },
    });
    if (!soItem) throw new BadRequestException('soItemId invalid for tenant');
    const max = new PrismaNs.Decimal(soItem.qty);
    const already = await this.sumReturnedElsewhere(tx, tenantId, soItemId, excludeSrItemId);
    const prior = sameBatchPriorQty ?? new PrismaNs.Decimal(0);
    if (already.add(prior).add(qty).gt(max)) {
      throw new BadRequestException('Return qty exceeds remaining qty for SO line');
    }
  }

  private async recalcSrTotals(tx: Prisma.TransactionClient, srId: string, taxRate: PrismaNs.Decimal) {
    const items = await tx.nx04SrItem.findMany({
      where: { srId },
      select: { lineAmount: true },
    });
    let sub = new PrismaNs.Decimal(0);
    for (const it of items) sub = sub.add(it.lineAmount);
    const tax = sub.mul(taxRate).div(100).toDecimalPlaces(2);
    const total = sub.add(tax);
    await tx.nx04Sr.update({
      where: { id: srId },
      data: { subtotal: sub, taxAmount: tax, totalAmount: total },
    });
  }

  private async applySrPosting(
    tx: Prisma.TransactionClient,
    srId: string,
    tenantId: string,
    userId: string,
  ) {
    const items = await tx.nx04SrItem.findMany({
      where: { srId },
      select: { ...SR_ITEM_SEL },
    });
    if (!items.length) throw new BadRequestException('Sales return has no items to post');
    for (const item of items) {
      const soItem = await tx.nx04SoItem.findFirst({
        where: { id: item.soItemId, so: { tenantId } },
        select: { warehouseId: true, unitPrice: true },
      });
      if (!soItem) throw new BadRequestException('SO item missing for sales return line');
      const qtyIn = new PrismaNs.Decimal(item.qty);
      if (qtyIn.lte(0)) continue;
      const locId =
        item.locationId?.trim() ||
        (await requireDefaultLocationId(tx, tenantId, soItem.warehouseId));
      const loc = await tx.nx01Location.findFirst({
        where: { id: locId, tenantId, warehouseId: soItem.warehouseId },
        select: { id: true },
      });
      if (!loc) throw new BadRequestException('locationId must belong to SO line warehouse');
      const bid = await tx.nx03StockBalance.findFirst({
        where: { tenantId, partId: item.partId, warehouseId: soItem.warehouseId },
        select: { avgCost: true },
      });
      const unitCost = bid ? new PrismaNs.Decimal(bid.avgCost) : new PrismaNs.Decimal(soItem.unitPrice);
      // M1 配套：load active part_version snapshot 帶入 ledger（NX03-IMPL-01 Phase 4 commit 2）
      const partVersion = await tx.nx01PartVersion.findFirst({
        where: { tenantId, partId: item.partId, effectiveTo: null },
        orderBy: { versionNo: 'desc' },
        select: { id: true },
      });
      await applyQtyInWithLedger(tx, {
        tenantId,
        userId,
        partId: item.partId,
        warehouseId: soItem.warehouseId,
        locationId: locId,
        qtyIn,
        unitCost,
        sourceModule: 'NX04',
        sourceDocType: 'R',
        sourceDocId: srId,
        sourceItemId: item.id,
        partVersionId: partVersion?.id ?? null,
      });
    }
  }

  async list(user: RequestUser, q: Nx04ListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx04Sr.count({ where }),
      this.prisma.nx04Sr.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: SR_SEL,
      }),
    ]);
    return { page, pageSize, total, items: rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx04Sr.findFirst({
      where: { id, tenantId },
      select: {
        ...SR_SEL,
        rev_Nx04SrItem_srId: { orderBy: { lineNo: 'asc' }, select: SR_ITEM_SEL },
      },
    });
    if (!row) throw new NotFoundException('Sales return not found');
    return this.mapDetail(row as never);
  }

  private async assertSoReturnable(tx: Prisma.TransactionClient, tenantId: string, soId: string) {
    const so = await tx.nx04So.findFirst({
      where: { id: soId, tenantId, cancelledAt: null },
      select: { id: true, status: true, customerId: true, warehouseId: true },
    });
    if (!so) throw new NotFoundException('SO not found');
    if (so.status !== SoStatus.SHIPPED && so.status !== SoStatus.INVOICED) {
      throw new BadRequestException('SO must be SHIPPED or INVOICED to create sales return');
    }
    return so;
  }

  private async createSrItemTx(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    srId: string,
    lineNo: number,
    dto: CreateSalesReturnItemDto,
    soId: string,
    batchAccum: Map<string, PrismaNs.Decimal>,
  ) {
    const tenantId = requireTenantId(user);
    const soItem = await tx.nx04SoItem.findFirst({
      where: { id: dto.soItemId.trim(), soId },
      select: {
        partId: true,
        partNo: true,
        partName: true,
        unitPrice: true,
      },
    });
    if (!soItem) throw new BadRequestException('soItemId must belong to source SO');
    const part = await tx.nx01Part.findFirst({
      where: { id: soItem.partId, tenantId },
      select: { returnPolicy: true },
    });
    if (!part) throw new NotFoundException('Part not found');
    const qty = new PrismaNs.Decimal(dto.qty);
    const key = dto.soItemId.trim();
    const prevInBatch = batchAccum.get(key) ?? new PrismaNs.Decimal(0);
    if ((dto.returnType?.trim() || 'N') === 'E' && !dto.concessionReason?.trim()) {
      throw new BadRequestException('concessionReason is required when returnType=E');
    }
    await this.validateReturnQty(tx, tenantId, key, qty, undefined, prevInBatch);
    batchAccum.set(key, prevInBatch.add(qty));
    const unit = new PrismaNs.Decimal(soItem.unitPrice);
    await tx.nx04SrItem.create({
      data: {
        srId,
        lineNo,
        soItemId: dto.soItemId.trim(),
        partId: soItem.partId,
        partNo: soItem.partNo,
        partName: soItem.partName,
        returnPolicy: part.returnPolicy,
        returnType: dto.returnType?.trim() || 'N',
        returnReason: dto.returnReason.trim(),
        concessionReason: dto.concessionReason?.trim() || null,
        qty,
        unitPrice: unit,
        lineAmount: this.lineAmount(qty, unit),
        locationId: dto.locationId?.trim() || null,
        remark: dto.remark?.trim() || null,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
    });
  }

  async create(user: RequestUser, dto: CreateSalesReturnDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const so = await this.assertSoReturnable(tx, tenantId, dto.soId.trim());
      const wh = await tx.nx01Warehouse.findFirst({
        where: { id: so.warehouseId, tenantId },
        select: { code: true },
      });
      if (!wh) throw new BadRequestException('SO warehouse invalid');
      const docNo = await allocNx04DocNo(tx, tenantId, 'SR', wh.code);
      const taxRate = new PrismaNs.Decimal(dto.taxRate);
      const sr = await tx.nx04Sr.create({
        data: {
          tenantId,
          docNo,
          warehouseId: so.warehouseId,
          srDate: new Date(dto.srDate),
          customerId: so.customerId,
          soId: so.id,
          returnMethod: dto.returnMethod.trim(),
          status: SalesReturnStatus.DRAFT,
          taxRate,
          subtotal: 0,
          taxAmount: 0,
          totalAmount: 0,
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: SR_SEL,
      });
      const batchAccum = new Map<string, PrismaNs.Decimal>();
      let lineNo = 1;
      if (dto.items?.length) {
        for (const it of dto.items) {
          await this.createSrItemTx(tx, user, sr.id, lineNo++, it, so.id, batchAccum);
        }
      }
      await this.recalcSrTotals(tx, sr.id, taxRate);
      const full = await tx.nx04Sr.findFirst({
        where: { id: sr.id },
        select: {
          ...SR_SEL,
          rev_Nx04SrItem_srId: { orderBy: { lineNo: 'asc' }, select: SR_ITEM_SEL },
        },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX04',
        action: 'CREATE',
        entityTable: 'nx04_sr',
        entityId: sr.id,
        entityCode: sr.docNo,
        summary: '建立銷退單',
        afterData: full as object,
      });
      return this.mapDetail(full as never);
    });
  }

  async update(user: RequestUser, id: string, dto: UpdateSalesReturnDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx04Sr.findFirst({ where: { id, tenantId }, select: SR_SEL });
    if (!existing) throw new NotFoundException('Sales return not found');

    if (dto.status !== undefined && dto.status !== existing.status) {
      assertSalesReturnStatusTransition(existing.status, dto.status);
    }
    if (dto.status === SalesReturnStatus.REJECTED && !dto.rejectReason?.trim()) {
      throw new BadRequestException('rejectReason is required when rejecting sales return');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.status === SalesReturnStatus.POSTED && existing.status === SalesReturnStatus.INSPECTING) {
        await this.applySrPosting(tx, id, tenantId, user.sub);
      }
      await tx.nx04Sr.update({
        where: { id },
        data: {
          ...(dto.srDate !== undefined ? { srDate: new Date(dto.srDate) } : {}),
          ...(dto.remark !== undefined ? { remark: dto.remark?.trim() || null } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.status === SalesReturnStatus.REJECTED ? { rejectReason: dto.rejectReason!.trim() } : {}),
          ...(dto.status === SalesReturnStatus.POSTED
            ? {
                receivedAt: new Date(),
                receivedBy: user.sub,
              }
            : {}),
          updatedBy: user.sub,
        },
      });
      const full = await tx.nx04Sr.findFirst({
        where: { id },
        select: {
          ...SR_SEL,
          rev_Nx04SrItem_srId: { orderBy: { lineNo: 'asc' }, select: SR_ITEM_SEL },
        },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX04',
        action: dto.status === SalesReturnStatus.POSTED ? 'POST' : 'UPDATE',
        entityTable: 'nx04_sr',
        entityId: id,
        entityCode: existing.docNo,
        summary: dto.status === SalesReturnStatus.POSTED ? '銷退過帳(POSTED)' : '修改銷退單',
        beforeData: existing as object,
        afterData: full as object,
      });
      return this.mapDetail(full as never);
    });
  }

  async softDelete(user: RequestUser, id: string, reason?: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx04Sr.findFirst({ where: { id, tenantId }, select: SR_SEL });
    if (!existing) throw new NotFoundException('Sales return not found');
    if (existing.status !== SalesReturnStatus.DRAFT && existing.status !== SalesReturnStatus.INSPECTING) {
      throw new BadRequestException('Only DRAFT or INSPECTING sales return can be voided');
    }
    assertSalesReturnStatusTransition(existing.status, SalesReturnStatus.CANCELLED);
    return this.prisma.$transaction(async (tx) => {
      const v = reason?.trim();
      const prevR = existing.remark?.trim();
      const nextRemark =
        v && prevR ? `${prevR} | VOID:${v}`.slice(0, 200) : v ? `VOID:${v}`.slice(0, 200) : existing.remark;
      await tx.nx04Sr.update({
        where: { id },
        data: {
          status: SalesReturnStatus.CANCELLED,
          remark: nextRemark,
          updatedBy: user.sub,
        },
      });
      const full = await tx.nx04Sr.findFirst({
        where: { id },
        select: {
          ...SR_SEL,
          rev_Nx04SrItem_srId: { orderBy: { lineNo: 'asc' }, select: SR_ITEM_SEL },
        },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX04',
        action: 'DELETE',
        entityTable: 'nx04_sr',
        entityId: id,
        entityCode: existing.docNo,
        summary: '作廢銷退單',
        beforeData: existing as object,
        afterData: full as object,
      });
      return this.mapDetail(full as never);
    });
  }

  async addItem(user: RequestUser, srId: string, dto: CreateSalesReturnItemDto) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx04Sr.findFirst({ where: { id: srId, tenantId }, select: SR_SEL });
    if (!head) throw new NotFoundException('Sales return not found');
    this.assertSrItemsEditable(head.status);
    const maxLine = await this.prisma.nx04SrItem.aggregate({ where: { srId }, _max: { lineNo: true } });
    const lineNo = (maxLine._max.lineNo ?? 0) + 1;
    await this.prisma.$transaction(async (tx) => {
      const batchAccum = new Map<string, PrismaNs.Decimal>();
      await this.createSrItemTx(tx, user, srId, lineNo, dto, head.soId, batchAccum);
      await this.recalcSrTotals(tx, srId, new PrismaNs.Decimal(String(head.taxRate)));
    });
    const row = await this.prisma.nx04SrItem.findFirst({
      where: { srId, lineNo },
      select: SR_ITEM_SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'CREATE',
      entityTable: 'nx04_sr_item',
      entityId: row!.id,
      entityCode: head.docNo,
      summary: '新增銷退明細',
      afterData: mapSrItemApi(row!) as object,
    });
    return mapSrItemApi(row!);
  }

  async patchItem(user: RequestUser, srId: string, itemId: string, dto: PatchSalesReturnItemDto) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx04Sr.findFirst({ where: { id: srId, tenantId }, select: SR_SEL });
    if (!head) throw new NotFoundException('Sales return not found');
    this.assertSrItemsEditable(head.status);
    const existing = await this.prisma.nx04SrItem.findFirst({ where: { id: itemId, srId }, select: SR_ITEM_SEL });
    if (!existing) throw new NotFoundException('Sales return item not found');
    if (dto.locationId !== undefined) {
      const soItem = await this.prisma.nx04SoItem.findFirst({
        where: { id: existing.soItemId },
        select: { warehouseId: true },
      });
      const loc = await this.prisma.nx01Location.findFirst({
        where: { id: dto.locationId.trim(), tenantId, warehouseId: soItem!.warehouseId },
        select: { id: true },
      });
      if (!loc) throw new BadRequestException('locationId must belong to SO line warehouse');
    }
    const qty = dto.qty !== undefined ? new PrismaNs.Decimal(dto.qty) : new PrismaNs.Decimal(existing.qty);
    const unit = new PrismaNs.Decimal(existing.unitPrice);
    await this.prisma.$transaction(async (tx) => {
      if (dto.qty !== undefined) {
        await this.validateReturnQty(tx, tenantId, existing.soItemId, qty, itemId);
      }
      await tx.nx04SrItem.update({
        where: { id: itemId },
        data: {
          ...(dto.locationId !== undefined ? { locationId: dto.locationId.trim() } : {}),
          qty,
          lineAmount: this.lineAmount(qty, unit),
          ...(dto.returnReason !== undefined ? { returnReason: dto.returnReason.trim() } : {}),
          ...(dto.returnType !== undefined ? { returnType: dto.returnType.trim() } : {}),
          ...(dto.concessionReason !== undefined ? { concessionReason: dto.concessionReason?.trim() || null } : {}),
          ...(dto.remark !== undefined ? { remark: dto.remark?.trim() || null } : {}),
          updatedBy: user.sub,
        },
      });
      await this.recalcSrTotals(tx, srId, new PrismaNs.Decimal(String(head.taxRate)));
    });
    const row = await this.prisma.nx04SrItem.findFirst({ where: { id: itemId }, select: SR_ITEM_SEL });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'UPDATE',
      entityTable: 'nx04_sr_item',
      entityId: itemId,
      entityCode: head.docNo,
      summary: '修改銷退明細',
      beforeData: mapSrItemApi(existing) as object,
      afterData: mapSrItemApi(row!) as object,
    });
    return mapSrItemApi(row!);
  }

  async removeItem(user: RequestUser, srId: string, itemId: string) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx04Sr.findFirst({ where: { id: srId, tenantId }, select: SR_SEL });
    if (!head) throw new NotFoundException('Sales return not found');
    this.assertSrItemsEditable(head.status);
    const existing = await this.prisma.nx04SrItem.findFirst({ where: { id: itemId, srId }, select: SR_ITEM_SEL });
    if (!existing) throw new NotFoundException('Sales return item not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.nx04SrItem.delete({ where: { id: itemId } });
      await this.recalcSrTotals(tx, srId, new PrismaNs.Decimal(String(head.taxRate)));
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'DELETE',
      entityTable: 'nx04_sr_item',
      entityId: itemId,
      entityCode: head.docNo,
      summary: '刪除銷退明細',
      beforeData: mapSrItemApi(existing) as object,
    });
    return { ok: true };
  }
}

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
import { allocDocNo } from '../../shared/nx02/nx02-doc-no';
import { Nx02ListQueryDto } from '../../shared/nx02/nx02-list-query.dto';
import { assertPoStatusTransition, PoStatus } from '../../shared/nx02/nx02-state-machine';
import { createApFromConfirmedPo } from '../../shared/nx05/nx05-create-ap-from-po';
import { syncApLedgerFromPo } from '../../shared/nx05/nx05-sync-ap-from-po';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreatePoDto, CreatePoItemDto, PatchPoItemDto, UpdatePoDto } from './dto/po.dto';

const PO_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  poDate: true,
  supplierId: true,
  rfqId: true,
  currencyId: true,
  status: true,
  subtotal: true,
  taxRate: true,
  taxAmount: true,
  totalAmount: true,
  expectedDate: true,
  remark: true,
  voidedAt: true,
  voidedBy: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

const PO_ITEM_SEL = {
  id: true,
  poId: true,
  rfqItemId: true,
  lineNo: true,
  partId: true,
  partNo: true,
  partName: true,
  qty: true,
  receivedQty: true,
  unitCost: true,
  lineAmount: true,
  expectedDate: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

@Injectable()
export class PoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx02ListQueryDto): Prisma.Nx02PoWhereInput {
    const where: Prisma.Nx02PoWhereInput = { tenantId, voidedAt: null };
    if (q.status?.trim()) where.status = q.status.trim();
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [{ docNo: { contains: s, mode: 'insensitive' } }, { remark: { contains: s, mode: 'insensitive' } }];
    }
    return where;
  }

  private assertPoItemsEditable(status: string) {
    if (
      status !== PoStatus.DRAFT &&
      status !== PoStatus.CONFIRMED &&
      status !== PoStatus.PARTIAL_RECEIVED
    ) {
      throw new BadRequestException('PO line items are not editable in current status');
    }
  }

  private async resolveWarehouseCodeForPo(tx: Prisma.TransactionClient, tenantId: string, rfqId?: string | null) {
    if (rfqId) {
      const rfq = await tx.nx02Rfq.findFirst({ where: { id: rfqId, tenantId }, select: { warehouseId: true } });
      if (!rfq) throw new NotFoundException('rfqId not found');
      const wh = await tx.nx01Warehouse.findFirst({ where: { id: rfq.warehouseId, tenantId }, select: { code: true } });
      if (!wh) throw new NotFoundException('RFQ warehouse not found');
      return wh.code;
    }
    const wh = await tx.nx01Warehouse.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { code: 'asc' },
      select: { code: true },
    });
    if (!wh) throw new BadRequestException('No active warehouse for tenant; set rfqId or create a warehouse');
    return wh.code;
  }

  private async loadPartSnapshot(tx: Prisma.TransactionClient, tenantId: string, partId: string) {
    const p = await tx.nx01Part.findFirst({
      where: { id: partId, tenantId },
      select: { code: true, name: true },
    });
    if (!p) throw new NotFoundException(`Part ${partId} not found`);
    return { partNo: p.code, partName: p.name };
  }

  private lineAmount(qty: PrismaNs.Decimal, unit: PrismaNs.Decimal) {
    return qty.mul(unit).toDecimalPlaces(2);
  }

  private async recalcPoTotals(tx: Prisma.TransactionClient, poId: string, taxRate: PrismaNs.Decimal) {
    const items = await tx.nx02PoItem.findMany({ where: { poId }, select: { lineAmount: true } });
    let sub = new PrismaNs.Decimal(0);
    for (const it of items) sub = sub.add(it.lineAmount);
    const tax = sub.mul(taxRate).div(100).toDecimalPlaces(2);
    const total = sub.add(tax);
    await tx.nx02Po.update({
      where: { id: poId },
      data: { subtotal: sub, taxAmount: tax, totalAmount: total },
    });
  }

  async list(user: RequestUser, q: Nx02ListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx02Po.count({ where }),
      this.prisma.nx02Po.findMany({
        where,
        orderBy: [{ poDate: 'desc' }, { docNo: 'desc' }],
        skip,
        take: pageSize,
        select: PO_SEL,
      }),
    ]);
    return { page, pageSize, total, rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx02Po.findFirst({
      where: { id, tenantId },
      select: { ...PO_SEL, rev_Nx02PoItem_poId: { orderBy: { lineNo: 'asc' }, select: PO_ITEM_SEL } },
    });
    if (!row) throw new NotFoundException('PO not found');
    return this.mapPoDetail(row);
  }

  private mapPoDetail(
    row: Prisma.Nx02PoGetPayload<{ select: typeof PO_SEL }> & {
      rev_Nx02PoItem_poId: Prisma.Nx02PoItemGetPayload<{ select: typeof PO_ITEM_SEL }>[];
    },
  ) {
    const { rev_Nx02PoItem_poId, ...rest } = row;
    return {
      ...rest,
      items: rev_Nx02PoItem_poId.map((it) => ({
        ...it,
        unitPriceSnapshot: it.unitCost,
      })),
    };
  }

  async create(user: RequestUser, dto: CreatePoDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      // NX02-IMPL-01 Phase 3 升：supplier load 帶付款條件 + incoterm（建單自動帶入、可手動覆寫）
      const sup = await tx.nx01Partner.findFirst({
        where: { id: dto.supplierId, tenantId },
        select: {
          id: true,
          paymentTermDomestic: true,
          paymentTermImport: true,
          incoterm: true,
        },
      });
      if (!sup) throw new NotFoundException('supplierId not found');
      if (dto.rfqId) {
        const rfq = await tx.nx02Rfq.findFirst({ where: { id: dto.rfqId, tenantId }, select: { id: true } });
        if (!rfq) throw new NotFoundException('rfqId not found');
      }
      const whCode = await this.resolveWarehouseCodeForPo(tx, tenantId, dto.rfqId ?? null);
      const docNo = await allocDocNo(tx, tenantId, 'PO', whCode);
      const taxRate = new PrismaNs.Decimal(dto.taxRate ?? 5);
      const currId = await resolveCurrencyId(tx, dto.currencyId ?? 'TWD');

      // NX02-IMPL-01 Phase 3 升：採購類型分流（D/I/B）+ 付款條件帶入 + 國外 stage=1
      const purchaseType = dto.purchaseType ?? 'D';
      const isImport = purchaseType === 'I';
      const isDomestic = purchaseType === 'D' || purchaseType === 'B';

      const po = await tx.nx02Po.create({
        data: {
          tenantId,
          docNo,
          poDate: new Date(dto.poDate),
          supplierId: dto.supplierId,
          rfqId: dto.rfqId?.trim() || null,
          currencyId: currId,
          status: PoStatus.DRAFT,
          taxRate,
          subtotal: new PrismaNs.Decimal(0),
          taxAmount: new PrismaNs.Decimal(0),
          totalAmount: new PrismaNs.Decimal(0),
          remark: dto.remark?.trim() || null,
          purchaseType,
          // 國內付款條件（D/B 模式）帶入、I 模式留 null
          paymentTermDomestic: isDomestic ? sup.paymentTermDomestic : null,
          // 國外付款條件 + incoterm（I 模式）帶入、D/B 模式留 null
          paymentTermImport: isImport ? sup.paymentTermImport : null,
          incoterm: isImport ? sup.incoterm : null,
          // 國外採購 6 階段預設 stage=1 備貨中（M2 配套、Crown Q-S1=A SmallInt）
          purchaseStage: isImport ? 1 : null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: PO_SEL,
      });
      let line = 1;
      for (const it of dto.items) {
        const snap = await this.loadPartSnapshot(tx, tenantId, it.partId.trim());
        const qty = new PrismaNs.Decimal(it.qty);
        const unit = new PrismaNs.Decimal(it.unitPriceSnapshot);
        const lineAmount = this.lineAmount(qty, unit);
        await tx.nx02PoItem.create({
          data: {
            poId: po.id,
            lineNo: line++,
            partId: it.partId.trim(),
            partNo: snap.partNo,
            partName: snap.partName,
            rfqItemId: it.rfqItemId?.trim() || null,
            qty,
            unitCost: unit,
            lineAmount,
            expectedDate: it.expectedDate ? new Date(it.expectedDate) : null,
            remark: it.remark?.trim() || null,
            createdBy: user.sub,
            updatedBy: user.sub,
          },
        });
      }
      await this.recalcPoTotals(tx, po.id, taxRate);
      const full = await tx.nx02Po.findFirst({
        where: { id: po.id },
        select: { ...PO_SEL, rev_Nx02PoItem_poId: { orderBy: { lineNo: 'asc' }, select: PO_ITEM_SEL } },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX02',
        action: 'CREATE',
        entityTable: 'nx02_po',
        entityId: po.id,
        entityCode: po.docNo,
        summary: '建立採購單',
        afterData: full as object,
      });
      return this.mapPoDetail(full!);
    });
  }

  async update(user: RequestUser, id: string, dto: UpdatePoDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx02Po.findFirst({ where: { id, tenantId }, select: PO_SEL });
    if (!existing) throw new NotFoundException('PO not found');
    if (existing.voidedAt) throw new BadRequestException('PO is voided');
    let nextStatus = existing.status;
    if (dto.status !== undefined && dto.status !== existing.status) {
      assertPoStatusTransition(existing.status, dto.status);
      nextStatus = dto.status;
    }
    const taxRate =
      dto.taxRate !== undefined ? new PrismaNs.Decimal(dto.taxRate) : new PrismaNs.Decimal(existing.taxRate);
    return this.prisma.$transaction(async (tx) => {
      // NX02-IMPL-01 Phase 3 升：DRAFT → CONFIRMED 自動寫 approvedAt + approvedBy（既有 schema 欄、業務語意「主管審核」）
      const isApproving = nextStatus === PoStatus.CONFIRMED && existing.status !== PoStatus.CONFIRMED;
      await tx.nx02Po.update({
        where: { id },
        data: {
          ...(dto.poDate !== undefined ? { poDate: new Date(dto.poDate) } : {}),
          ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
          ...(dto.expectedDate !== undefined ? { expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null } : {}),
          ...(dto.status !== undefined ? { status: nextStatus } : {}),
          ...(dto.taxRate !== undefined ? { taxRate } : {}),
          ...(isApproving ? { approvedAt: new Date(), approvedBy: user.sub } : {}),
          updatedBy: user.sub,
        },
      });
      if (dto.taxRate !== undefined) await this.recalcPoTotals(tx, id, taxRate);
      if (isApproving) {
        await createApFromConfirmedPo(tx, { tenantId, poId: id, userId: user.sub });
      }
      await syncApLedgerFromPo(tx, { tenantId, poId: id, userId: user.sub });
      const full = await tx.nx02Po.findFirst({
        where: { id },
        select: { ...PO_SEL, rev_Nx02PoItem_poId: { orderBy: { lineNo: 'asc' }, select: PO_ITEM_SEL } },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX02',
        action: 'UPDATE',
        entityTable: 'nx02_po',
        entityId: id,
        entityCode: existing.docNo,
        summary: '修改採購單',
        beforeData: existing as object,
        afterData: full as object,
      });
      return this.mapPoDetail(full!);
    });
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx02Po.findFirst({ where: { id, tenantId }, select: PO_SEL });
    if (!existing) throw new NotFoundException('PO not found');
    if (existing.voidedAt) throw new BadRequestException('PO already voided');
    assertPoStatusTransition(existing.status, PoStatus.CANCELLED);
    await this.prisma.nx02Po.update({
      where: { id },
      data: { voidedAt: new Date(), voidedBy: user.sub, status: PoStatus.CANCELLED, updatedBy: user.sub },
    });
    const full = await this.prisma.nx02Po.findFirst({
      where: { id },
      select: { ...PO_SEL, rev_Nx02PoItem_poId: { orderBy: { lineNo: 'asc' }, select: PO_ITEM_SEL } },
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX02',
      action: 'DELETE',
      entityTable: 'nx02_po',
      entityId: id,
      entityCode: existing.docNo,
      summary: '作廢採購單',
      beforeData: existing as object,
      afterData: full as object,
    });
    return this.mapPoDetail(full!);
  }

  async addItem(user: RequestUser, poId: string, dto: CreatePoItemDto) {
    const tenantId = requireTenantId(user);
    const po = await this.prisma.nx02Po.findFirst({ where: { id: poId, tenantId }, select: PO_SEL });
    if (!po) throw new NotFoundException('PO not found');
    if (po.voidedAt) throw new BadRequestException('PO is voided');
    this.assertPoItemsEditable(po.status);
    const snap = await this.loadPartSnapshot(this.prisma, tenantId, dto.partId.trim());
    const maxLine = await this.prisma.nx02PoItem.aggregate({ where: { poId }, _max: { lineNo: true } });
    const lineNo = (maxLine._max.lineNo ?? 0) + 1;
    const qty = new PrismaNs.Decimal(dto.qty);
    const unit = new PrismaNs.Decimal(dto.unitPriceSnapshot);
    const lineAmount = this.lineAmount(qty, unit);
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.nx02PoItem.create({
        data: {
          poId,
          lineNo,
          partId: dto.partId.trim(),
          partNo: snap.partNo,
          partName: snap.partName,
          rfqItemId: dto.rfqItemId?.trim() || null,
          qty,
          unitCost: unit,
          lineAmount,
          expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: PO_ITEM_SEL,
      });
      await this.recalcPoTotals(tx, poId, new PrismaNs.Decimal(po.taxRate));
      await syncApLedgerFromPo(tx, { tenantId, poId, userId: user.sub });
      return created;
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX02',
      action: 'CREATE',
      entityTable: 'nx02_po_item',
      entityId: row.id,
      entityCode: po.docNo,
      summary: '新增採購明細',
      afterData: row as object,
    });
    return { ...row, unitPriceSnapshot: row.unitCost };
  }

  async patchItem(user: RequestUser, poId: string, itemId: string, dto: PatchPoItemDto) {
    const tenantId = requireTenantId(user);
    const po = await this.prisma.nx02Po.findFirst({ where: { id: poId, tenantId }, select: PO_SEL });
    if (!po) throw new NotFoundException('PO not found');
    if (po.voidedAt) throw new BadRequestException('PO is voided');
    this.assertPoItemsEditable(po.status);
    const existing = await this.prisma.nx02PoItem.findFirst({ where: { id: itemId, poId }, select: PO_ITEM_SEL });
    if (!existing) throw new NotFoundException('PO item not found');
    const qty = dto.qty !== undefined ? new PrismaNs.Decimal(dto.qty) : existing.qty;
    const unit =
      dto.unitPriceSnapshot !== undefined ? new PrismaNs.Decimal(dto.unitPriceSnapshot) : existing.unitCost;
    const lineAmount = this.lineAmount(qty, unit);
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.nx02PoItem.update({
        where: { id: itemId },
        data: {
          ...(dto.qty !== undefined ? { qty } : {}),
          ...(dto.unitPriceSnapshot !== undefined ? { unitCost: unit } : {}),
          lineAmount,
          ...(dto.expectedDate !== undefined ? { expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null } : {}),
          ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
          updatedBy: user.sub,
        },
        select: PO_ITEM_SEL,
      });
      await this.recalcPoTotals(tx, poId, new PrismaNs.Decimal(po.taxRate));
      await syncApLedgerFromPo(tx, { tenantId, poId, userId: user.sub });
      return updated;
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX02',
      action: 'UPDATE',
      entityTable: 'nx02_po_item',
      entityId: itemId,
      entityCode: po.docNo,
      summary: '修改採購明細',
      beforeData: existing as object,
      afterData: row as object,
    });
    return { ...row, unitPriceSnapshot: row.unitCost };
  }

  async removeItem(user: RequestUser, poId: string, itemId: string) {
    const tenantId = requireTenantId(user);
    const po = await this.prisma.nx02Po.findFirst({ where: { id: poId, tenantId }, select: PO_SEL });
    if (!po) throw new NotFoundException('PO not found');
    if (po.voidedAt) throw new BadRequestException('PO is voided');
    this.assertPoItemsEditable(po.status);
    const existing = await this.prisma.nx02PoItem.findFirst({ where: { id: itemId, poId }, select: PO_ITEM_SEL });
    if (!existing) throw new NotFoundException('PO item not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.nx02PoItem.delete({ where: { id: itemId } });
      await this.recalcPoTotals(tx, poId, new PrismaNs.Decimal(po.taxRate));
      await syncApLedgerFromPo(tx, { tenantId, poId, userId: user.sub });
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX02',
      action: 'DELETE',
      entityTable: 'nx02_po_item',
      entityId: itemId,
      entityCode: po.docNo,
      summary: '刪除採購明細',
      beforeData: existing as object,
    });
    return { ok: true };
  }
}

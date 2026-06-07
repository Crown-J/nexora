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

import type { PoListQueryDto } from './dto/po.dto';
import { assertPoStatusTransition, PoStatus } from '../../shared/nx02/nx02-state-machine';
import { createApFromConfirmedPo } from '../../shared/nx05/nx05-create-ap-from-po';
import { syncApLedgerFromPo } from '../../shared/nx05/nx05-sync-ap-from-po';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreatePoDto, CreatePoItemDto, PatchPoItemDto, UpdatePoDto } from './dto/po.dto';
// T0 2026-06-07：採購單轉進貨單 wrapper（避免前端組明細快照）
import { RrService } from '../rr/rr.service';

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
  // 階段 I P4：國外進貨 6 階段欄位（前端國外採購頁需要）
  purchaseType: true,
  purchaseStage: true,
  paymentTermImport: true,
  paymentTermDomestic: true,
  incoterm: true,
  vesselNo: true,
  containerNo: true,
  eta: true,
  requestedPaymentAt: true,
  paidAt: true,
  shippedAt: true,
  arrivedAt: true,
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
    private readonly rrService: RrService,
  ) {}

  /**
   * T0 路徑收斂 2026-06-07：採購單轉進貨單 wrapper。
   * 業務語意：PoDetailView「轉進貨」按鈕、選收貨倉 + 勾要收的明細 → 建草稿 RR、UI 跳到 RR 詳細頁過帳。
   * 內部：抓 PoItem 取 partId / unitCost（avoiding caller 自己組）、組 RrService.create dto。
   */
  async toRr(
    user: RequestUser,
    poId: string,
    dto: { warehouseId: string; items: { poItemId: string; qty: number; locationId?: string | null }[] },
  ) {
    const tenantId = requireTenantId(user);
    const po = await this.prisma.nx02Po.findFirst({
      where: { id: poId, tenantId, voidedAt: null },
      include: { rev_Nx02PoItem_poId: true },
    });
    if (!po) throw new NotFoundException('PO not found');
    if (!dto.items?.length) throw new BadRequestException('items required');

    const wh = await this.prisma.nx01Warehouse.findFirst({
      where: { id: dto.warehouseId, tenantId, isActive: true },
      select: { id: true },
    });
    if (!wh) throw new BadRequestException('warehouseId invalid');

    const itemMap = new Map(po.rev_Nx02PoItem_poId.map((it) => [it.id, it]));
    const rrItems: { partId: string; locationId: string; qty: number; unitPriceSnapshot: number; remark?: string }[] = [];
    for (const i of dto.items) {
      const it = itemMap.get(i.poItemId);
      if (!it) throw new BadRequestException(`poItemId ${i.poItemId} not in PO`);
      const remain = Number(it.qty) - Number(it.receivedQty ?? 0);
      if (i.qty > remain) throw new BadRequestException(`qty ${i.qty} exceeds remaining ${remain} for ${it.partNo}`);
      rrItems.push({
        partId: it.partId,
        locationId: i.locationId?.trim() || '',
        qty: i.qty,
        unitPriceSnapshot: Number(it.unitCost),
      });
    }
    if (rrItems.some((x) => !x.locationId)) {
      throw new BadRequestException('locationId required for every item');
    }
    return this.rrService.create(user, {
      rrDate: new Date().toISOString().slice(0, 10),
      warehouseId: dto.warehouseId,
      supplierId: po.supplierId,
      poId,
      items: rrItems,
    });
  }

  private whereList(tenantId: string, q: PoListQueryDto): Prisma.Nx02PoWhereInput {
    const where: Prisma.Nx02PoWhereInput = { tenantId, voidedAt: null };
    if (q.status?.trim()) where.status = q.status.trim();
    if (q.purchaseType) where.purchaseType = q.purchaseType;
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [{ docNo: { contains: s, mode: 'insensitive' } }, { remark: { contains: s, mode: 'insensitive' } }];
    }
    return where;
  }

  private assertPoItemsEditable(status: string) {
    // v1.2 階段 F P3：開放 APPROVED 主管在審核階段直接改採購單（總經理拍板「直接改」、不退回）
    // 業務語意：避免主管駁回 → 開單人改 → 再送審的來回浪費、主管小調整可順手改完往下送
    if (
      status !== PoStatus.DRAFT &&
      status !== PoStatus.APPROVED &&
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

  async list(user: RequestUser, q: PoListQueryDto) {
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
      // v1.2 階段 F P3：拆兩個觸發時機
      // - APPROVED（主管審核通過）：寫 approvedAt + approvedBy
      // - CONFIRMED（廠商確認備貨）：呼叫 createApFromConfirmedPo 產生應付（業務語意「先款後貨」）
      const isApproving = nextStatus === PoStatus.APPROVED && existing.status !== PoStatus.APPROVED;
      const isVendorConfirming = nextStatus === PoStatus.CONFIRMED && existing.status !== PoStatus.CONFIRMED;
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
      if (isVendorConfirming) {
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

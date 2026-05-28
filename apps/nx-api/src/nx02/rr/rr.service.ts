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
import { assertRrStatusTransition, RrStatus } from '../../shared/nx02/nx02-state-machine';
import { applyQtyInWithLedger } from '../../shared/nx03/nx03-inventory';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreateRrDto, CreateRrItemDto, PatchRrItemDto, UpdateRrDto } from './dto/rr.dto';

const RR_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  warehouseId: true,
  supplierId: true,
  rfqId: true,
  poId: true,
  tiId: true,
  currencyId: true,
  status: true,
  subtotal: true,
  taxRate: true,
  taxAmount: true,
  totalAmount: true,
  remark: true,
  voidedAt: true,
  voidedBy: true,
  postedAt: true,
  postedBy: true,
  rrDate: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

const RR_ITEM_SEL = {
  id: true,
  rrId: true,
  lineNo: true,
  partId: true,
  partNo: true,
  partName: true,
  locationId: true,
  qty: true,
  unitCost: true,
  lineAmount: true,
  expectedQty: true,
  actualQty: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

@Injectable()
export class RrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx02ListQueryDto): Prisma.Nx02RrWhereInput {
    const where: Prisma.Nx02RrWhereInput = { tenantId, voidedAt: null };
    if (q.status?.trim()) where.status = q.status.trim();
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [{ docNo: { contains: s, mode: 'insensitive' } }, { remark: { contains: s, mode: 'insensitive' } }];
    }
    return where;
  }

  private assertRrItemsEditable(status: string) {
    if (status !== RrStatus.DRAFT && status !== RrStatus.INSPECTING) {
      throw new BadRequestException('RR line items are not editable in current status');
    }
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

  private async recalcRrTotals(tx: Prisma.TransactionClient, rrId: string, taxRate: PrismaNs.Decimal) {
    const items = await tx.nx02RrItem.findMany({ where: { rrId }, select: { lineAmount: true } });
    let sub = new PrismaNs.Decimal(0);
    for (const it of items) sub = sub.add(it.lineAmount);
    const tax = sub.mul(taxRate).div(100).toDecimalPlaces(2);
    const total = sub.add(tax);
    await tx.nx02Rr.update({
      where: { id: rrId },
      data: { subtotal: sub, taxAmount: tax, totalAmount: total },
    });
  }

  /**
   * M1 配套：取 part 當下最新 active version（effectiveTo IS NULL、versionNo desc）
   * Q-S1=B 漸進：partVersion 表為 null 也 OK（NX01-17 未完全 backfill 既有 part）
   */
  private async loadActivePartVersionId(
    tx: Prisma.TransactionClient,
    tenantId: string,
    partId: string,
  ): Promise<string | null> {
    const v = await tx.nx01PartVersion.findFirst({
      where: { tenantId, partId, effectiveTo: null },
      orderBy: { versionNo: 'desc' },
      select: { id: true },
    });
    return v?.id ?? null;
  }

  /**
   * RR 過帳：透過 applyQtyInWithLedger helper 寫 stock_balance + stock_ledger。
   *   - source 判 tiId：rr.tiId != null → 'G'（同行調貨入庫、Phase 4 d 方案）；null → 'P'（採購進貨）
   *   - partVersionId 帶入（M1 配套、每 item load active version）
   *   - 保留 Nx02PoItem.receivedQty update（PO 進度回填）
   * 升級自 NX03-IMPL-01 Phase 4 commit 1（自 inline upsert 換 helper、語意對齊 stocktake/init service 範式）。
   */
  private async applyRrPosting(tx: Prisma.TransactionClient, rr: Prisma.Nx02RrGetPayload<{ select: typeof RR_SEL }>, userId: string) {
    const items = await tx.nx02RrItem.findMany({
      where: { rrId: rr.id },
      select: { ...RR_ITEM_SEL },
    });
    if (!items.length) throw new BadRequestException('RR has no items to post');

    // 同行調貨入庫（tiId!=null）supplier 必須是同行 partner_type='O'
    // partner 改制六分類：C=保養廠 / O=同行 / S=純供應商 / T=外包物流 / B=銀行 / V=一般廠商
    if (rr.tiId) {
      const supplier = await tx.nx01Partner.findFirst({
        where: { id: rr.supplierId, tenantId: rr.tenantId },
        select: { partnerType: true },
      });
      if (!supplier || supplier.partnerType !== 'O') {
        throw new BadRequestException(
          `RR with tiId (同行調貨入庫) supplierId partnerType must be 'O' (同行), got '${supplier?.partnerType ?? 'not found'}'`,
        );
      }
    }

    const sourceDocType = rr.tiId ? 'G' : 'P';
    let postedQty = new PrismaNs.Decimal(0);
    for (const item of items) {
      const qtyIn = item.actualQty != null ? new PrismaNs.Decimal(item.actualQty) : new PrismaNs.Decimal(item.qty);
      if (qtyIn.lte(0)) continue;
      postedQty = postedQty.add(qtyIn);
      const unitCost = new PrismaNs.Decimal(item.unitCost);
      const partVersionId = await this.loadActivePartVersionId(tx, rr.tenantId, item.partId);

      await applyQtyInWithLedger(tx, {
        tenantId: rr.tenantId,
        userId,
        partId: item.partId,
        warehouseId: rr.warehouseId,
        locationId: item.locationId,
        qtyIn,
        unitCost,
        sourceModule: 'NX02',
        sourceDocType,
        sourceDocId: rr.id,
        sourceItemId: item.id,
        partVersionId,
      });

      if (rr.poId) {
        const pol = await tx.nx02PoItem.findFirst({
          where: { poId: rr.poId, partId: item.partId },
          orderBy: { lineNo: 'asc' },
        });
        if (pol) {
          const prev = new PrismaNs.Decimal(pol.receivedQty);
          await tx.nx02PoItem.update({
            where: { id: pol.id },
            data: { receivedQty: prev.add(qtyIn), updatedBy: userId },
          });
        }
      }
    }
    if (postedQty.lte(0)) throw new BadRequestException('Posted quantity must be > 0 (set actualQty or qty on lines)');
  }

  async list(user: RequestUser, q: Nx02ListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx02Rr.count({ where }),
      this.prisma.nx02Rr.findMany({
        where,
        orderBy: [{ rrDate: 'desc' }, { docNo: 'desc' }],
        skip,
        take: pageSize,
        select: RR_SEL,
      }),
    ]);
    return { page, pageSize, total, rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx02Rr.findFirst({
      where: { id, tenantId },
      select: { ...RR_SEL, rev_Nx02RrItem_rrId: { orderBy: { lineNo: 'asc' }, select: RR_ITEM_SEL } },
    });
    if (!row) throw new NotFoundException('RR not found');
    return this.mapRrDetail(row);
  }

  private mapRrDetail(
    row: Prisma.Nx02RrGetPayload<{ select: typeof RR_SEL }> & {
      rev_Nx02RrItem_rrId: Prisma.Nx02RrItemGetPayload<{ select: typeof RR_ITEM_SEL }>[];
    },
  ) {
    const { rev_Nx02RrItem_rrId, ...rest } = row;
    return {
      ...rest,
      items: rev_Nx02RrItem_rrId.map((it) => ({
        ...it,
        unitPriceSnapshot: it.unitCost,
      })),
    };
  }

  async create(user: RequestUser, dto: CreateRrDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const wh = await tx.nx01Warehouse.findFirst({ where: { id: dto.warehouseId, tenantId }, select: { code: true } });
      if (!wh) throw new NotFoundException('warehouseId not found');
      const sup = await tx.nx01Partner.findFirst({ where: { id: dto.supplierId, tenantId }, select: { id: true } });
      if (!sup) throw new NotFoundException('supplierId not found');
      if (dto.rfqId) {
        const r = await tx.nx02Rfq.findFirst({ where: { id: dto.rfqId, tenantId }, select: { id: true } });
        if (!r) throw new NotFoundException('rfqId not found');
      }
      if (dto.poId) {
        const p = await tx.nx02Po.findFirst({ where: { id: dto.poId, tenantId }, select: { id: true } });
        if (!p) throw new NotFoundException('poId not found');
      }
      const docNo = await allocDocNo(tx, tenantId, 'RR', wh.code);
      const taxRate = new PrismaNs.Decimal(dto.taxRate ?? 5);
      const currId = await resolveCurrencyId(tx, dto.currencyId ?? 'TWD');
      const rr = await tx.nx02Rr.create({
        data: {
          tenantId,
          docNo,
          rrDate: new Date(dto.rrDate),
          warehouseId: dto.warehouseId,
          supplierId: dto.supplierId,
          rfqId: dto.rfqId?.trim() || null,
          poId: dto.poId?.trim() || null,
          currencyId: currId,
          status: RrStatus.DRAFT,
          taxRate,
          subtotal: new PrismaNs.Decimal(0),
          taxAmount: new PrismaNs.Decimal(0),
          totalAmount: new PrismaNs.Decimal(0),
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: RR_SEL,
      });
      let line = 1;
      for (const it of dto.items) {
        const loc = await tx.nx01Location.findFirst({
          where: { id: it.locationId, tenantId, warehouseId: dto.warehouseId },
          select: { id: true },
        });
        if (!loc) throw new BadRequestException('locationId must belong to RR warehouse');
        const snap = await this.loadPartSnapshot(tx, tenantId, it.partId.trim());
        const qty = new PrismaNs.Decimal(it.qty);
        const unit = new PrismaNs.Decimal(it.unitPriceSnapshot);
        const expQ = it.expectedQty != null ? new PrismaNs.Decimal(it.expectedQty) : qty;
        const lineAmount = this.lineAmount(qty, unit);
        await tx.nx02RrItem.create({
          data: {
            rrId: rr.id,
            lineNo: line++,
            partId: it.partId.trim(),
            partNo: snap.partNo,
            partName: snap.partName,
            locationId: it.locationId.trim(),
            qty,
            unitCost: unit,
            lineAmount,
            expectedQty: expQ,
            actualQty: it.actualQty != null ? new PrismaNs.Decimal(it.actualQty) : null,
            remark: it.remark?.trim() || null,
            createdBy: user.sub,
            updatedBy: user.sub,
          },
        });
      }
      await this.recalcRrTotals(tx, rr.id, taxRate);
      const full = await tx.nx02Rr.findFirst({
        where: { id: rr.id },
        select: { ...RR_SEL, rev_Nx02RrItem_rrId: { orderBy: { lineNo: 'asc' }, select: RR_ITEM_SEL } },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX02',
        action: 'CREATE',
        entityTable: 'nx02_rr',
        entityId: rr.id,
        entityCode: rr.docNo,
        summary: '建立進貨單',
        afterData: full as object,
      });
      return this.mapRrDetail(full!);
    });
  }

  async update(user: RequestUser, id: string, dto: UpdateRrDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx02Rr.findFirst({ where: { id, tenantId }, select: RR_SEL });
    if (!existing) throw new NotFoundException('RR not found');
    if (existing.voidedAt) throw new BadRequestException('RR is voided');

    const taxRate =
      dto.taxRate !== undefined ? new PrismaNs.Decimal(dto.taxRate) : new PrismaNs.Decimal(existing.taxRate);

    if (dto.status !== undefined && dto.status !== existing.status) {
      assertRrStatusTransition(existing.status, dto.status);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.status === RrStatus.POSTED && existing.status === RrStatus.INSPECTING) {
        const head = await tx.nx02Rr.findFirst({ where: { id, tenantId }, select: RR_SEL });
        if (!head) throw new NotFoundException('RR not found');
        await this.applyRrPosting(tx, head, user.sub);
        await tx.nx02Rr.update({
          where: { id },
          data: {
            status: RrStatus.POSTED,
            postedAt: new Date(),
            postedBy: user.sub,
            ...(dto.rrDate !== undefined ? { rrDate: new Date(dto.rrDate) } : {}),
            ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
            ...(dto.taxRate !== undefined ? { taxRate } : {}),
            updatedBy: user.sub,
          },
        });
      } else {
        await tx.nx02Rr.update({
          where: { id },
          data: {
            ...(dto.rrDate !== undefined ? { rrDate: new Date(dto.rrDate) } : {}),
            ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
            ...(dto.status !== undefined ? { status: dto.status } : {}),
            ...(dto.taxRate !== undefined ? { taxRate } : {}),
            updatedBy: user.sub,
          },
        });
      }
      if (dto.taxRate !== undefined) await this.recalcRrTotals(tx, id, taxRate);
      const full = await tx.nx02Rr.findFirst({
        where: { id },
        select: { ...RR_SEL, rev_Nx02RrItem_rrId: { orderBy: { lineNo: 'asc' }, select: RR_ITEM_SEL } },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX02',
        action: dto.status === RrStatus.POSTED ? 'POST' : 'UPDATE',
        entityTable: 'nx02_rr',
        entityId: id,
        entityCode: existing.docNo,
        summary: dto.status === RrStatus.POSTED ? '進貨單過帳' : '修改進貨單',
        beforeData: existing as object,
        afterData: full as object,
      });
      return this.mapRrDetail(full!);
    });
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx02Rr.findFirst({ where: { id, tenantId }, select: RR_SEL });
    if (!existing) throw new NotFoundException('RR not found');
    if (existing.voidedAt) throw new BadRequestException('RR already voided');
    if (existing.status === RrStatus.POSTED) throw new BadRequestException('Cannot void posted RR');
    assertRrStatusTransition(existing.status, RrStatus.CANCELLED);
    await this.prisma.nx02Rr.update({
      where: { id },
      data: { voidedAt: new Date(), voidedBy: user.sub, status: RrStatus.CANCELLED, updatedBy: user.sub },
    });
    const full = await this.prisma.nx02Rr.findFirst({
      where: { id },
      select: { ...RR_SEL, rev_Nx02RrItem_rrId: { orderBy: { lineNo: 'asc' }, select: RR_ITEM_SEL } },
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX02',
      action: 'DELETE',
      entityTable: 'nx02_rr',
      entityId: id,
      entityCode: existing.docNo,
      summary: '作廢進貨單',
      beforeData: existing as object,
      afterData: full as object,
    });
    return this.mapRrDetail(full!);
  }

  async addItem(user: RequestUser, rrId: string, dto: CreateRrItemDto) {
    const tenantId = requireTenantId(user);
    const rr = await this.prisma.nx02Rr.findFirst({ where: { id: rrId, tenantId }, select: RR_SEL });
    if (!rr) throw new NotFoundException('RR not found');
    if (rr.voidedAt) throw new BadRequestException('RR is voided');
    this.assertRrItemsEditable(rr.status);
    const loc = await this.prisma.nx01Location.findFirst({
      where: { id: dto.locationId, tenantId, warehouseId: rr.warehouseId },
      select: { id: true },
    });
    if (!loc) throw new BadRequestException('locationId must belong to RR warehouse');
    const snap = await this.loadPartSnapshot(this.prisma, tenantId, dto.partId.trim());
    const maxLine = await this.prisma.nx02RrItem.aggregate({ where: { rrId }, _max: { lineNo: true } });
    const lineNo = (maxLine._max.lineNo ?? 0) + 1;
    const qty = new PrismaNs.Decimal(dto.qty);
    const unit = new PrismaNs.Decimal(dto.unitPriceSnapshot);
    const expQ = dto.expectedQty != null ? new PrismaNs.Decimal(dto.expectedQty) : qty;
    const lineAmount = this.lineAmount(qty, unit);
    const row = await this.prisma.nx02RrItem.create({
      data: {
        rrId,
        lineNo,
        partId: dto.partId.trim(),
        partNo: snap.partNo,
        partName: snap.partName,
        locationId: dto.locationId.trim(),
        qty,
        unitCost: unit,
        lineAmount,
        expectedQty: expQ,
        actualQty: dto.actualQty != null ? new PrismaNs.Decimal(dto.actualQty) : null,
        remark: dto.remark?.trim() || null,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: RR_ITEM_SEL,
    });
    await this.recalcRrTotals(this.prisma, rrId, new PrismaNs.Decimal(rr.taxRate));
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX02',
      action: 'CREATE',
      entityTable: 'nx02_rr_item',
      entityId: row.id,
      entityCode: rr.docNo,
      summary: '新增進貨明細',
      afterData: row as object,
    });
    return { ...row, unitPriceSnapshot: row.unitCost };
  }

  async patchItem(user: RequestUser, rrId: string, itemId: string, dto: PatchRrItemDto) {
    const tenantId = requireTenantId(user);
    const rr = await this.prisma.nx02Rr.findFirst({ where: { id: rrId, tenantId }, select: RR_SEL });
    if (!rr) throw new NotFoundException('RR not found');
    if (rr.voidedAt) throw new BadRequestException('RR is voided');
    this.assertRrItemsEditable(rr.status);
    const existing = await this.prisma.nx02RrItem.findFirst({ where: { id: itemId, rrId }, select: RR_ITEM_SEL });
    if (!existing) throw new NotFoundException('RR item not found');
    const qty = dto.qty !== undefined ? new PrismaNs.Decimal(dto.qty) : new PrismaNs.Decimal(existing.qty);
    const unit =
      dto.unitPriceSnapshot !== undefined ? new PrismaNs.Decimal(dto.unitPriceSnapshot) : new PrismaNs.Decimal(existing.unitCost);
    const lineAmount = this.lineAmount(qty, unit);
    const row = await this.prisma.nx02RrItem.update({
      where: { id: itemId },
      data: {
        ...(dto.qty !== undefined ? { qty } : {}),
        ...(dto.unitPriceSnapshot !== undefined ? { unitCost: unit } : {}),
        lineAmount,
        ...(dto.expectedQty !== undefined ? { expectedQty: new PrismaNs.Decimal(dto.expectedQty) } : {}),
        ...(dto.actualQty !== undefined ? { actualQty: dto.actualQty == null ? null : new PrismaNs.Decimal(dto.actualQty) } : {}),
        ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
        updatedBy: user.sub,
      },
      select: RR_ITEM_SEL,
    });
    await this.recalcRrTotals(this.prisma, rrId, new PrismaNs.Decimal(rr.taxRate));
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX02',
      action: 'UPDATE',
      entityTable: 'nx02_rr_item',
      entityId: itemId,
      entityCode: rr.docNo,
      summary: '修改進貨明細',
      beforeData: existing as object,
      afterData: row as object,
    });
    return { ...row, unitPriceSnapshot: row.unitCost };
  }

  async removeItem(user: RequestUser, rrId: string, itemId: string) {
    const tenantId = requireTenantId(user);
    const rr = await this.prisma.nx02Rr.findFirst({ where: { id: rrId, tenantId }, select: RR_SEL });
    if (!rr) throw new NotFoundException('RR not found');
    if (rr.voidedAt) throw new BadRequestException('RR is voided');
    this.assertRrItemsEditable(rr.status);
    const existing = await this.prisma.nx02RrItem.findFirst({ where: { id: itemId, rrId }, select: RR_ITEM_SEL });
    if (!existing) throw new NotFoundException('RR item not found');
    await this.prisma.nx02RrItem.delete({ where: { id: itemId } });
    await this.recalcRrTotals(this.prisma, rrId, new PrismaNs.Decimal(rr.taxRate));
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX02',
      action: 'DELETE',
      entityTable: 'nx02_rr_item',
      entityId: itemId,
      entityCode: rr.docNo,
      summary: '刪除進貨明細',
      beforeData: existing as object,
    });
    return { ok: true };
  }
}

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
import { allocNx03DocNo } from '../../shared/nx03/nx03-doc-no';
import { applyQtyInWithLedger, applyQtyOutWithLedger } from '../../shared/nx03/nx03-inventory';
import { Nx03ListQueryDto } from '../../shared/nx03/nx03-list-query.dto';
import {
  assertStockTakeStatusTransition,
  StockTakeStatus,
} from '../../shared/nx03/nx03-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreateStockTakeDto, CreateStockTakeItemDto, PatchStockTakeItemDto, UpdateStockTakeDto } from './dto/stocktake.dto';

const ST_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  warehouseId: true,
  stockTakeDate: true,
  scopeType: true,
  status: true,
  remark: true,
  voidedAt: true,
  voidedBy: true,
  postedAt: true,
  postedBy: true,
  startedAt: true,
  // M2 dynamic stocktake snapshot 時間範圍（Q-B3=A application 層即時聚合 stock_ledger）
  snapshotStartedAt: true,
  snapshotEndedAt: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

const ST_ITEM_SEL = {
  id: true,
  stockTakeId: true,
  lineNo: true,
  partId: true,
  partNo: true,
  partName: true,
  // M1 配套 part_version snapshot
  partVersionId: true,
  warehouseId: true,
  locationId: true,
  systemQty: true,
  countedQty: true,
  diffQty: true,
  unitCost: true,
  diffCost: true,
  adjustType: true,
  status: true,
  remark: true,
  // M2 動態盤點 snapshot+delta 4 欄（既有 systemQty/diffQty 保留並存 Q-S2=A）
  snapshotQty: true,
  deltaQty: true,
  formulaExpectedQty: true,
  realDiffQty: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

@Injectable()
export class StockTakeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx03ListQueryDto): Prisma.Nx03StockTakeWhereInput {
    const where: Prisma.Nx03StockTakeWhereInput = { tenantId, voidedAt: null };
    if (q.status?.trim()) where.status = q.status.trim();
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [{ docNo: { contains: s, mode: 'insensitive' } }, { remark: { contains: s, mode: 'insensitive' } }];
    }
    return where;
  }

  private assertItemsEditable(status: string) {
    if (
      status !== StockTakeStatus.DRAFT &&
      status !== StockTakeStatus.COUNTING &&
      status !== StockTakeStatus.ADJUSTING
    ) {
      throw new BadRequestException('Stock take line items are not editable in current status');
    }
  }

  private async loadPartSnapshot(tx: Prisma.TransactionClient, tenantId: string, partId: string) {
    const p = await tx.nx01Part.findFirst({
      where: { id: partId, tenantId },
      select: { code: true, name: true },
    });
    if (!p) throw new NotFoundException(`Part ${partId} not found`);
    return { partNo: p.code, partName: p.name };
  }

  private async snapshotSystemQty(
    tx: Prisma.TransactionClient,
    tenantId: string,
    warehouseId: string,
    partId: string,
  ): Promise<PrismaNs.Decimal> {
    const bal = await tx.nx03StockBalance.findFirst({
      where: { tenantId, warehouseId, partId },
      select: { onHandQty: true },
    });
    if (!bal) return new PrismaNs.Decimal(0);
    return new PrismaNs.Decimal(bal.onHandQty);
  }

  private async resolveUnitCost(
    tx: Prisma.TransactionClient,
    tenantId: string,
    warehouseId: string,
    partId: string,
  ): Promise<PrismaNs.Decimal> {
    const bal = await tx.nx03StockBalance.findFirst({
      where: { tenantId, warehouseId, partId },
      select: { avgCost: true },
    });
    if (!bal) return new PrismaNs.Decimal(0);
    return new PrismaNs.Decimal(bal.avgCost);
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
   * M2 動態盤點：聚合 stock_ledger 在 snapshot 時間範圍內的異動加總
   * Q-B3=A application 層即時聚合（不用 DB trigger、不凍結業務）
   * deltaQty = SUM(qtyIn) - SUM(qtyOut) WHERE part+warehouse+location AND movementDate BETWEEN [start, end]
   */
  private async aggregateLedgerDelta(
    tx: Prisma.TransactionClient,
    tenantId: string,
    partId: string,
    warehouseId: string,
    locationId: string,
    startedAt: Date,
    endedAt: Date,
  ): Promise<PrismaNs.Decimal> {
    const agg = await tx.nx03StockLedger.aggregate({
      where: {
        tenantId,
        partId,
        warehouseId,
        locationId,
        movementDate: { gte: startedAt, lte: endedAt },
      },
      _sum: { qtyIn: true, qtyOut: true },
    });
    const qIn = new PrismaNs.Decimal(agg._sum.qtyIn ?? 0);
    const qOut = new PrismaNs.Decimal(agg._sum.qtyOut ?? 0);
    return qIn.sub(qOut);
  }

  /**
   * M2 動態盤點 posting：
   *   - snapshotEndedAt 設為 now（在進入此函式前已寫入 header）
   *   - 對每 item：聚合 ledger SUM 算 deltaQty、formulaExpectedQty = snapshot + delta
   *   - realDiffQty = countedQty - formulaExpectedQty（M2 新基準、誤差才寫帳）
   *   - 既有 diffQty/diffCost/adjustType 保留並存（Q-S2=A、= countedQty - systemQty）
   *   - 寫 ledger source=T 走 realDiffQty（非 diffQty）
   *   - partVersionId 帶入 helper（M1 配套）
   * snapshotEndedAt 必填、否則 throw（盤點未啟動就過帳是非法狀態）
   */
  private async applyStockTakePosting(
    tx: Prisma.TransactionClient,
    st: Prisma.Nx03StockTakeGetPayload<{ select: typeof ST_SEL }>,
    userId: string,
  ) {
    if (!st.snapshotStartedAt || !st.snapshotEndedAt) {
      throw new BadRequestException(
        'Stock take snapshot time range missing (snapshotStartedAt/EndedAt required for posting)',
      );
    }
    const startedAt = st.snapshotStartedAt;
    const endedAt = st.snapshotEndedAt;
    const items = await tx.nx03StockTakeItem.findMany({
      where: { stockTakeId: st.id },
      select: { ...ST_ITEM_SEL },
    });
    if (!items.length) throw new BadRequestException('Stock take has no items to post');

    for (const item of items) {
      const counted = new PrismaNs.Decimal(item.countedQty);
      const systemQty = new PrismaNs.Decimal(item.systemQty);
      const snapshotQty = new PrismaNs.Decimal(item.snapshotQty);
      const diff = counted.sub(systemQty); // 既有 systemQty 路徑（保留並存 Q-S2=A）

      // M2 主路徑：deltaQty 即時聚合、formulaExpectedQty 應有量、realDiffQty 真實誤差
      const deltaQty = await this.aggregateLedgerDelta(
        tx,
        st.tenantId,
        item.partId,
        item.warehouseId,
        item.locationId,
        startedAt,
        endedAt,
      );
      const formulaExpectedQty = snapshotQty.add(deltaQty);
      const realDiffQty = counted.sub(formulaExpectedQty);

      const uc =
        new PrismaNs.Decimal(item.unitCost).gt(0)
          ? new PrismaNs.Decimal(item.unitCost)
          : await this.resolveUnitCost(tx, st.tenantId, item.warehouseId, item.partId);

      // realDiffQty != 0 才寫帳（M2 業務語意：真實誤差才入 ledger source=T）
      if (!realDiffQty.eq(0)) {
        if (realDiffQty.gt(0)) {
          await applyQtyInWithLedger(tx, {
            tenantId: st.tenantId,
            userId,
            partId: item.partId,
            warehouseId: item.warehouseId,
            locationId: item.locationId,
            qtyIn: realDiffQty,
            unitCost: uc,
            sourceModule: 'NX03',
            sourceDocType: 'T',
            sourceDocId: st.id,
            sourceItemId: item.id,
            partVersionId: item.partVersionId,
          });
        } else {
          await applyQtyOutWithLedger(tx, {
            tenantId: st.tenantId,
            userId,
            partId: item.partId,
            warehouseId: item.warehouseId,
            locationId: item.locationId,
            qtyOut: realDiffQty.abs(),
            sourceModule: 'NX03',
            sourceDocType: 'T',
            sourceDocId: st.id,
            sourceItemId: item.id,
            partVersionId: item.partVersionId,
          });
        }
      }

      const adj: 'I' | 'O' | 'N' = diff.eq(0) ? 'N' : diff.gt(0) ? 'I' : 'O';
      await tx.nx03StockTakeItem.update({
        where: { id: item.id },
        data: {
          // 既有 systemQty 路徑保留（Q-S2=A）
          diffQty: diff,
          unitCost: uc,
          diffCost: diff.abs().mul(uc).toDecimalPlaces(2),
          adjustType: adj,
          // M2 snapshot+delta 新欄
          deltaQty,
          formulaExpectedQty,
          realDiffQty,
          updatedBy: userId,
        },
      });
    }
  }

  private mapDetail(row: { rev_Nx03StockTakeItem_stockTakeId: unknown[] } & Record<string, unknown>) {
    const { rev_Nx03StockTakeItem_stockTakeId: items, ...rest } = row;
    return { ...rest, items };
  }

  async list(user: RequestUser, q: Nx03ListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx03StockTake.count({ where }),
      this.prisma.nx03StockTake.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: ST_SEL,
      }),
    ]);
    return { page, pageSize, total, items: rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx03StockTake.findFirst({
      where: { id, tenantId },
      select: {
        ...ST_SEL,
        rev_Nx03StockTakeItem_stockTakeId: { orderBy: { lineNo: 'asc' }, select: ST_ITEM_SEL },
      },
    });
    if (!row) throw new NotFoundException('Stock take not found');
    return this.mapDetail(row as never);
  }

  async create(user: RequestUser, dto: CreateStockTakeDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const wh = await tx.nx01Warehouse.findFirst({
        where: { id: dto.warehouseId.trim(), tenantId },
        select: { id: true, code: true },
      });
      if (!wh) throw new BadRequestException('warehouseId invalid');
      const docNo = await allocNx03DocNo(tx, tenantId, 'SL', wh.code);
      const st = await tx.nx03StockTake.create({
        data: {
          tenantId,
          docNo,
          warehouseId: wh.id,
          stockTakeDate: new Date(dto.stockTakeDate),
          scopeType: dto.scopeType?.trim() || 'F',
          status: StockTakeStatus.DRAFT,
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: ST_SEL,
      });
      let line = 1;
      if (dto.items?.length) {
        for (const it of dto.items) {
          await this.addItemTx(tx, user, st, wh.id, line++, it);
        }
      }
      const full = await tx.nx03StockTake.findFirst({
        where: { id: st.id },
        select: {
          ...ST_SEL,
          rev_Nx03StockTakeItem_stockTakeId: { orderBy: { lineNo: 'asc' }, select: ST_ITEM_SEL },
        },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: 'CREATE',
        entityTable: 'nx03_stock_take',
        entityId: st.id,
        entityCode: st.docNo,
        summary: '建立盤點單',
        afterData: full as object,
      });
      return this.mapDetail(full as never);
    });
  }

  private async addItemTx(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    st: Prisma.Nx03StockTakeGetPayload<{ select: typeof ST_SEL }>,
    headerWarehouseId: string,
    lineNo: number,
    it: CreateStockTakeItemDto,
  ) {
    const tenantId = st.tenantId;
    const wId = it.warehouseId?.trim() || headerWarehouseId;
    if (wId !== headerWarehouseId) throw new BadRequestException('Item warehouse must match stock take header');
    const loc = await tx.nx01Location.findFirst({
      where: { id: it.locationId.trim(), tenantId, warehouseId: wId },
      select: { id: true },
    });
    if (!loc) throw new BadRequestException('locationId must belong to warehouse');
    const snap = await this.loadPartSnapshot(tx, tenantId, it.partId.trim());
    const partVersionId = await this.loadActivePartVersionId(tx, tenantId, it.partId.trim());
    const systemQty = await this.snapshotSystemQty(tx, tenantId, wId, it.partId.trim());
    const counted =
      it.countedQty != null ? new PrismaNs.Decimal(it.countedQty) : systemQty;
    const diff = counted.sub(systemQty);
    const uc = await this.resolveUnitCost(tx, tenantId, wId, it.partId.trim());
    await tx.nx03StockTakeItem.create({
      data: {
        stockTakeId: st.id,
        lineNo,
        partId: it.partId.trim(),
        partNo: snap.partNo,
        partName: snap.partName,
        // M1 配套：寫入當下 part_version snapshot
        partVersionId,
        warehouseId: wId,
        locationId: it.locationId.trim(),
        systemQty,
        countedQty: counted,
        diffQty: diff,
        unitCost: uc,
        diffCost: diff.abs().mul(uc).toDecimalPlaces(2),
        adjustType: diff.eq(0) ? 'N' : diff.gt(0) ? 'I' : 'O',
        // M2 snapshot 初始值 = systemQty（盤點未啟動前、跟系統量同步、啟動時會 backfill）
        snapshotQty: systemQty,
        // deltaQty / formulaExpectedQty / realDiffQty 用 schema default 0、過帳時才算
        remark: it.remark?.trim() || null,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
    });
  }

  async update(user: RequestUser, id: string, dto: UpdateStockTakeDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx03StockTake.findFirst({ where: { id, tenantId }, select: ST_SEL });
    if (!existing) throw new NotFoundException('Stock take not found');
    if (existing.voidedAt) throw new BadRequestException('Stock take is voided');

    if (dto.status !== undefined && dto.status !== existing.status) {
      assertStockTakeStatusTransition(existing.status, dto.status);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.status === StockTakeStatus.POSTED && existing.status === StockTakeStatus.ADJUSTING) {
        // M2 ADJUSTING → POSTED：先寫 snapshotEndedAt（applyStockTakePosting 內聚合 ledger BETWEEN range）
        const endedAt = new Date();
        await tx.nx03StockTake.update({
          where: { id },
          data: { snapshotEndedAt: endedAt, updatedBy: user.sub },
        });
        const head = await tx.nx03StockTake.findFirst({ where: { id, tenantId }, select: ST_SEL });
        if (!head) throw new NotFoundException('Stock take not found');
        await this.applyStockTakePosting(tx, head, user.sub);
        await tx.nx03StockTake.update({
          where: { id },
          data: {
            status: StockTakeStatus.POSTED,
            postedAt: new Date(),
            postedBy: user.sub,
            ...(dto.stockTakeDate !== undefined ? { stockTakeDate: new Date(dto.stockTakeDate) } : {}),
            ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
            updatedBy: user.sub,
          },
        });
      } else {
        const extra: Prisma.Nx03StockTakeUpdateInput = {};
        if (dto.status === StockTakeStatus.COUNTING && existing.status === StockTakeStatus.DRAFT) {
          // M2 DRAFT → COUNTING：寫 snapshotStartedAt + backfill 所有 items snapshotQty（鎖定基準）
          const startedAt = new Date();
          extra.startedAt = startedAt;
          extra.snapshotStartedAt = startedAt;
          // backfill items.snapshotQty 為當下 balance（DRAFT 階段可能 stale、啟動時鎖定）
          const items = await tx.nx03StockTakeItem.findMany({
            where: { stockTakeId: id },
            select: { id: true, partId: true, warehouseId: true, partVersionId: true },
          });
          for (const it of items) {
            const snapshotQty = await this.snapshotSystemQty(tx, tenantId, it.warehouseId, it.partId);
            // partVersionId 若 DRAFT 階段未填、補上（M1 配套漸進）
            const data: Prisma.Nx03StockTakeItemUpdateInput = { snapshotQty, updatedBy: user.sub };
            if (!it.partVersionId) {
              data.partVersion = {
                connect: undefined,
              };
              const pvid = await this.loadActivePartVersionId(tx, tenantId, it.partId);
              if (pvid) {
                data.partVersion = { connect: { id: pvid } };
              } else {
                delete data.partVersion;
              }
            }
            await tx.nx03StockTakeItem.update({ where: { id: it.id }, data });
          }
        }
        await tx.nx03StockTake.update({
          where: { id },
          data: {
            ...(dto.stockTakeDate !== undefined ? { stockTakeDate: new Date(dto.stockTakeDate) } : {}),
            ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
            ...(dto.status !== undefined ? { status: dto.status } : {}),
            ...extra,
            updatedBy: user.sub,
          },
        });
      }
      const full = await tx.nx03StockTake.findFirst({
        where: { id },
        select: {
          ...ST_SEL,
          rev_Nx03StockTakeItem_stockTakeId: { orderBy: { lineNo: 'asc' }, select: ST_ITEM_SEL },
        },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: dto.status === StockTakeStatus.POSTED ? 'POST' : 'UPDATE',
        entityTable: 'nx03_stock_take',
        entityId: id,
        entityCode: existing.docNo,
        summary: dto.status === StockTakeStatus.POSTED ? '盤點過帳' : '修改盤點單',
        beforeData: existing as object,
        afterData: full as object,
      });
      return this.mapDetail(full as never);
    });
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx03StockTake.findFirst({ where: { id, tenantId }, select: ST_SEL });
    if (!existing) throw new NotFoundException('Stock take not found');
    if (existing.voidedAt) throw new BadRequestException('Stock take already voided');
    if (existing.status === StockTakeStatus.POSTED) throw new BadRequestException('Cannot void posted stock take');
    assertStockTakeStatusTransition(existing.status, StockTakeStatus.CANCELLED);
    await this.prisma.nx03StockTake.update({
      where: { id },
      data: { voidedAt: new Date(), voidedBy: user.sub, status: StockTakeStatus.CANCELLED, updatedBy: user.sub },
    });
    const full = await this.prisma.nx03StockTake.findFirst({
      where: { id },
      select: {
        ...ST_SEL,
        rev_Nx03StockTakeItem_stockTakeId: { orderBy: { lineNo: 'asc' }, select: ST_ITEM_SEL },
      },
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: 'DELETE',
      entityTable: 'nx03_stock_take',
      entityId: id,
      entityCode: existing.docNo,
      summary: '作廢盤點單',
      beforeData: existing as object,
      afterData: full as object,
    });
    return this.mapDetail(full as never);
  }

  async addItem(user: RequestUser, stockTakeId: string, dto: CreateStockTakeItemDto) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx03StockTake.findFirst({ where: { id: stockTakeId, tenantId }, select: ST_SEL });
    if (!head) throw new NotFoundException('Stock take not found');
    if (head.voidedAt) throw new BadRequestException('Stock take is voided');
    this.assertItemsEditable(head.status);
    return this.prisma.$transaction(async (tx) => {
      const maxLine = await tx.nx03StockTakeItem.aggregate({ where: { stockTakeId }, _max: { lineNo: true } });
      const lineNo = (maxLine._max.lineNo ?? 0) + 1;
      await this.addItemTx(tx, user, head, head.warehouseId, lineNo, dto);
      const row = await tx.nx03StockTakeItem.findFirst({
        where: { stockTakeId, lineNo },
        select: ST_ITEM_SEL,
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: 'CREATE',
        entityTable: 'nx03_stock_take_item',
        entityId: row!.id,
        entityCode: head.docNo,
        summary: '新增盤點明細',
        afterData: row as object,
      });
      return row;
    });
  }

  async patchItem(user: RequestUser, stockTakeId: string, itemId: string, dto: PatchStockTakeItemDto) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx03StockTake.findFirst({ where: { id: stockTakeId, tenantId }, select: ST_SEL });
    if (!head) throw new NotFoundException('Stock take not found');
    if (head.voidedAt) throw new BadRequestException('Stock take is voided');
    this.assertItemsEditable(head.status);
    const existing = await this.prisma.nx03StockTakeItem.findFirst({
      where: { id: itemId, stockTakeId },
      select: ST_ITEM_SEL,
    });
    if (!existing) throw new NotFoundException('Stock take item not found');
    const counted =
      dto.countedQty !== undefined ? new PrismaNs.Decimal(dto.countedQty) : new PrismaNs.Decimal(existing.countedQty);
    const systemQty = new PrismaNs.Decimal(existing.systemQty);
    const diff = counted.sub(systemQty);
    const uc = new PrismaNs.Decimal(existing.unitCost);
    const row = await this.prisma.nx03StockTakeItem.update({
      where: { id: itemId },
      data: {
        countedQty: counted,
        diffQty: diff,
        diffCost: diff.abs().mul(uc).toDecimalPlaces(2),
        adjustType: diff.eq(0) ? 'N' : diff.gt(0) ? 'I' : 'O',
        ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
        updatedBy: user.sub,
      },
      select: ST_ITEM_SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: 'UPDATE',
      entityTable: 'nx03_stock_take_item',
      entityId: itemId,
      entityCode: head.docNo,
      summary: '修改盤點明細',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  async removeItem(user: RequestUser, stockTakeId: string, itemId: string) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx03StockTake.findFirst({ where: { id: stockTakeId, tenantId }, select: ST_SEL });
    if (!head) throw new NotFoundException('Stock take not found');
    if (head.voidedAt) throw new BadRequestException('Stock take is voided');
    this.assertItemsEditable(head.status);
    const existing = await this.prisma.nx03StockTakeItem.findFirst({
      where: { id: itemId, stockTakeId },
      select: ST_ITEM_SEL,
    });
    if (!existing) throw new NotFoundException('Stock take item not found');
    await this.prisma.nx03StockTakeItem.delete({ where: { id: itemId } });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: 'DELETE',
      entityTable: 'nx03_stock_take_item',
      entityId: itemId,
      entityCode: head.docNo,
      summary: '刪除盤點明細',
      beforeData: existing as object,
    });
    return { ok: true };
  }
}

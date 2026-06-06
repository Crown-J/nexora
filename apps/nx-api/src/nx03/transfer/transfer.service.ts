import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { planSupportsNx02PlusFeatures } from '../../shared/plan/plan-plus-support';
import { allocNx03DocNo } from '../../shared/nx03/nx03-doc-no';
import { applyQtyInWithLedger, applyQtyOutWithLedger } from '../../shared/nx03/nx03-inventory';
import { Nx03ListQueryDto } from '../../shared/nx03/nx03-list-query.dto';
import {
  assertTransferStatusTransition,
  TransferStatus,
} from '../../shared/nx03/nx03-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreateTransferDto, CreateTransferItemDto, PatchTransferItemDto, UpdateTransferDto } from './dto/transfer.dto';

const TR_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  stDate: true,
  fromWarehouseId: true,
  toWarehouseId: true,
  status: true,
  remark: true,
  voidedAt: true,
  voidedBy: true,
  postedAt: true,
  postedBy: true,
  receivedAt: true,
  receivedBy: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

// W6-Phase 4b 2026-06-06：select 切 brandId（Phase 5 drop part_brand_id 欄位）
const TR_ITEM_SEL = {
  id: true,
  stId: true,
  lineNo: true,
  partId: true,
  partNo: true,
  partName: true,
  brandId: true,
  fromLocationId: true,
  toLocationId: true,
  qty: true,
  unitCost: true,
  receivedQty: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

@Injectable()
export class TransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private ensurePlus(user: RequestUser) {
    if (!planSupportsNx02PlusFeatures(user.planCode)) {
      throw new ForbiddenException('Transfer requires PLUS or PRO plan');
    }
  }

  private whereList(tenantId: string, q: Nx03ListQueryDto): Prisma.Nx03StWhereInput {
    const where: Prisma.Nx03StWhereInput = { tenantId, voidedAt: null };
    if (q.status?.trim()) where.status = q.status.trim();
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [{ docNo: { contains: s, mode: 'insensitive' } }, { remark: { contains: s, mode: 'insensitive' } }];
    }
    return where;
  }

  private assertItemsEditable(status: string) {
    if (status !== TransferStatus.DRAFT) {
      throw new BadRequestException('Transfer line items are only editable in DRAFT');
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

  private async applyTransferReceived(
    tx: Prisma.TransactionClient,
    st: Prisma.Nx03StGetPayload<{ select: typeof TR_SEL }>,
    userId: string,
  ) {
    const items = await tx.nx03StItem.findMany({
      where: { stId: st.id },
      select: { ...TR_ITEM_SEL },
    });
    if (!items.length) throw new BadRequestException('Transfer has no items to receive');

    for (const item of items) {
      const qtyMove =
        item.receivedQty != null ? new PrismaNs.Decimal(item.receivedQty) : new PrismaNs.Decimal(item.qty);
      if (qtyMove.lte(0)) continue;
      if (!item.fromLocationId || !item.toLocationId) {
        throw new BadRequestException('Transfer items require fromLocationId and toLocationId');
      }
      const bid = await tx.nx03StockBalance.findFirst({
        where: { tenantId: st.tenantId, partId: item.partId, warehouseId: st.fromWarehouseId },
        select: { avgCost: true },
      });
      const uc =
        item.unitCost != null && new PrismaNs.Decimal(item.unitCost).gt(0)
          ? new PrismaNs.Decimal(item.unitCost)
          : bid
            ? new PrismaNs.Decimal(bid.avgCost)
            : new PrismaNs.Decimal(0);

      // M1 配套：load active part_version snapshot 帶入兩個 ledger row（out + in、同 partId 共用）
      const partVersion = await tx.nx01PartVersion.findFirst({
        where: { tenantId: st.tenantId, partId: item.partId, effectiveTo: null },
        orderBy: { versionNo: 'desc' },
        select: { id: true },
      });
      const partVersionId = partVersion?.id ?? null;

      await applyQtyOutWithLedger(tx, {
        tenantId: st.tenantId,
        userId,
        partId: item.partId,
        warehouseId: st.fromWarehouseId,
        locationId: item.fromLocationId,
        qtyOut: qtyMove,
        sourceModule: 'NX03',
        sourceDocType: 'X',
        sourceDocId: st.id,
        sourceItemId: item.id,
        partVersionId,
      });

      await applyQtyInWithLedger(tx, {
        tenantId: st.tenantId,
        userId,
        partId: item.partId,
        warehouseId: st.toWarehouseId,
        locationId: item.toLocationId,
        qtyIn: qtyMove,
        unitCost: uc,
        sourceModule: 'NX03',
        sourceDocType: 'X',
        sourceDocId: st.id,
        sourceItemId: item.id,
        partVersionId,
      });
    }
  }

  private mapDetail(row: { rev_Nx03StItem_stId: unknown[] } & Record<string, unknown>) {
    const { rev_Nx03StItem_stId: items, ...rest } = row;
    return { ...rest, items };
  }

  async list(user: RequestUser, q: Nx03ListQueryDto) {
    this.ensurePlus(user);
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx03St.count({ where }),
      this.prisma.nx03St.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: TR_SEL,
      }),
    ]);
    return { page, pageSize, total, items: rows };
  }

  async getById(user: RequestUser, id: string) {
    this.ensurePlus(user);
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx03St.findFirst({
      where: { id, tenantId },
      select: {
        ...TR_SEL,
        rev_Nx03StItem_stId: { orderBy: { lineNo: 'asc' }, select: TR_ITEM_SEL },
      },
    });
    if (!row) throw new NotFoundException('Transfer not found');
    return this.mapDetail(row as never);
  }

  async create(user: RequestUser, dto: CreateTransferDto) {
    this.ensurePlus(user);
    const tenantId = requireTenantId(user);
    if (dto.fromWarehouseId.trim() === dto.toWarehouseId.trim()) {
      throw new BadRequestException('fromWarehouseId and toWarehouseId must differ');
    }
    return this.prisma.$transaction(async (tx) => {
      const fromWh = await tx.nx01Warehouse.findFirst({
        where: { id: dto.fromWarehouseId.trim(), tenantId },
        select: { id: true, code: true },
      });
      const toWh = await tx.nx01Warehouse.findFirst({
        where: { id: dto.toWarehouseId.trim(), tenantId },
        select: { id: true, code: true },
      });
      if (!fromWh || !toWh) throw new BadRequestException('Invalid warehouse id');
      const docNo = await allocNx03DocNo(tx, tenantId, 'ST', fromWh.code);
      const st = await tx.nx03St.create({
        data: {
          tenantId,
          docNo,
          fromWarehouseId: fromWh.id,
          toWarehouseId: toWh.id,
          stDate: new Date(dto.stDate),
          status: TransferStatus.DRAFT,
          remark: dto.remark?.trim() || null,
          stType: 'M',
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: TR_SEL,
      });
      let line = 1;
      if (dto.items?.length) {
        for (const it of dto.items) {
          await this.addItemTx(tx, user, st, fromWh.id, toWh.id, line++, it);
        }
      }
      const full = await tx.nx03St.findFirst({
        where: { id: st.id },
        select: {
          ...TR_SEL,
          rev_Nx03StItem_stId: { orderBy: { lineNo: 'asc' }, select: TR_ITEM_SEL },
        },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: 'CREATE',
        entityTable: 'nx03_st',
        entityId: st.id,
        entityCode: st.docNo,
        summary: '建立調撥單',
        afterData: full as object,
      });
      return this.mapDetail(full as never);
    });
  }

  private async addItemTx(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    st: Prisma.Nx03StGetPayload<{ select: typeof TR_SEL }>,
    fromWhId: string,
    toWhId: string,
    lineNo: number,
    it: CreateTransferItemDto,
  ) {
    const tenantId = st.tenantId;
    const fl = await tx.nx01Location.findFirst({
      where: { id: it.fromLocationId.trim(), tenantId, warehouseId: fromWhId },
      select: { id: true },
    });
    const tl = await tx.nx01Location.findFirst({
      where: { id: it.toLocationId.trim(), tenantId, warehouseId: toWhId },
      select: { id: true },
    });
    if (!fl || !tl) throw new BadRequestException('Location must belong to from/to warehouse');
    const snap = await this.loadPartSnapshot(tx, tenantId, it.partId.trim());
    const qty = new PrismaNs.Decimal(it.qty);
    const uc = it.unitCost != null ? new PrismaNs.Decimal(it.unitCost) : new PrismaNs.Decimal(0);
    await tx.nx03StItem.create({
      data: {
        stId: st.id,
        lineNo,
        partId: it.partId.trim(),
        partNo: snap.partNo,
        partName: snap.partName,
        // W6-Phase 4b：寫 brandId（partBrandId 欄位即將 drop、frontend 已切 brand.id 語意）
        brandId: it.partBrandId?.trim() || null,
        fromLocationId: it.fromLocationId.trim(),
        toLocationId: it.toLocationId.trim(),
        qty,
        unitCost: uc,
        remark: it.remark?.trim() || null,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
    });
  }

  async update(user: RequestUser, id: string, dto: UpdateTransferDto) {
    this.ensurePlus(user);
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx03St.findFirst({ where: { id, tenantId }, select: TR_SEL });
    if (!existing) throw new NotFoundException('Transfer not found');
    if (existing.voidedAt) throw new BadRequestException('Transfer is voided');

    if (dto.status !== undefined && dto.status !== existing.status) {
      assertTransferStatusTransition(existing.status, dto.status);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.status === TransferStatus.RECEIVED && existing.status === TransferStatus.TRANSIT) {
        const head = await tx.nx03St.findFirst({ where: { id, tenantId }, select: TR_SEL });
        if (!head) throw new NotFoundException('Transfer not found');
        await this.applyTransferReceived(tx, head, user.sub);
        const now = new Date();
        await tx.nx03St.update({
          where: { id },
          data: {
            status: TransferStatus.RECEIVED,
            postedAt: now,
            postedBy: user.sub,
            receivedAt: now,
            receivedBy: user.sub,
            ...(dto.stDate !== undefined ? { stDate: new Date(dto.stDate) } : {}),
            ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
            updatedBy: user.sub,
          },
        });
      } else {
        await tx.nx03St.update({
          where: { id },
          data: {
            ...(dto.stDate !== undefined ? { stDate: new Date(dto.stDate) } : {}),
            ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
            ...(dto.status !== undefined ? { status: dto.status } : {}),
            updatedBy: user.sub,
          },
        });
      }
      const full = await tx.nx03St.findFirst({
        where: { id },
        select: {
          ...TR_SEL,
          rev_Nx03StItem_stId: { orderBy: { lineNo: 'asc' }, select: TR_ITEM_SEL },
        },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: dto.status === TransferStatus.RECEIVED ? 'POST' : 'UPDATE',
        entityTable: 'nx03_st',
        entityId: id,
        entityCode: existing.docNo,
        summary: dto.status === TransferStatus.RECEIVED ? '調撥收貨過帳' : '修改調撥單',
        beforeData: existing as object,
        afterData: full as object,
      });
      return this.mapDetail(full as never);
    });
  }

  async softDelete(user: RequestUser, id: string) {
    this.ensurePlus(user);
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx03St.findFirst({ where: { id, tenantId }, select: TR_SEL });
    if (!existing) throw new NotFoundException('Transfer not found');
    if (existing.voidedAt) throw new BadRequestException('Transfer already voided');
    if (existing.status === TransferStatus.RECEIVED) throw new BadRequestException('Cannot void received transfer');
    assertTransferStatusTransition(existing.status, TransferStatus.CANCELLED);
    await this.prisma.nx03St.update({
      where: { id },
      data: { voidedAt: new Date(), voidedBy: user.sub, status: TransferStatus.CANCELLED, updatedBy: user.sub },
    });
    const full = await this.prisma.nx03St.findFirst({
      where: { id },
      select: {
        ...TR_SEL,
        rev_Nx03StItem_stId: { orderBy: { lineNo: 'asc' }, select: TR_ITEM_SEL },
      },
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: 'DELETE',
      entityTable: 'nx03_st',
      entityId: id,
      entityCode: existing.docNo,
      summary: '作廢調撥單',
      beforeData: existing as object,
      afterData: full as object,
    });
    return this.mapDetail(full as never);
  }

  async addItem(user: RequestUser, stId: string, dto: CreateTransferItemDto) {
    this.ensurePlus(user);
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx03St.findFirst({ where: { id: stId, tenantId }, select: TR_SEL });
    if (!head) throw new NotFoundException('Transfer not found');
    if (head.voidedAt) throw new BadRequestException('Transfer is voided');
    this.assertItemsEditable(head.status);
    return this.prisma.$transaction(async (tx) => {
      const maxLine = await tx.nx03StItem.aggregate({ where: { stId }, _max: { lineNo: true } });
      const lineNo = (maxLine._max.lineNo ?? 0) + 1;
      await this.addItemTx(tx, user, head, head.fromWarehouseId, head.toWarehouseId, lineNo, dto);
      const row = await tx.nx03StItem.findFirst({
        where: { stId, lineNo },
        select: TR_ITEM_SEL,
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: 'CREATE',
        entityTable: 'nx03_st_item',
        entityId: row!.id,
        entityCode: head.docNo,
        summary: '新增調撥明細',
        afterData: row as object,
      });
      return row;
    });
  }

  async patchItem(user: RequestUser, stId: string, itemId: string, dto: PatchTransferItemDto) {
    this.ensurePlus(user);
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx03St.findFirst({ where: { id: stId, tenantId }, select: TR_SEL });
    if (!head) throw new NotFoundException('Transfer not found');
    if (head.voidedAt) throw new BadRequestException('Transfer is voided');
    this.assertItemsEditable(head.status);
    const existing = await this.prisma.nx03StItem.findFirst({ where: { id: itemId, stId }, select: TR_ITEM_SEL });
    if (!existing) throw new NotFoundException('Transfer item not found');
    if (dto.fromLocationId !== undefined) {
      const fl = await this.prisma.nx01Location.findFirst({
        where: { id: dto.fromLocationId.trim(), tenantId, warehouseId: head.fromWarehouseId },
        select: { id: true },
      });
      if (!fl) throw new BadRequestException('fromLocationId invalid');
    }
    if (dto.toLocationId !== undefined) {
      const tl = await this.prisma.nx01Location.findFirst({
        where: { id: dto.toLocationId.trim(), tenantId, warehouseId: head.toWarehouseId },
        select: { id: true },
      });
      if (!tl) throw new BadRequestException('toLocationId invalid');
    }
    const row = await this.prisma.nx03StItem.update({
      where: { id: itemId },
      data: {
        ...(dto.fromLocationId !== undefined ? { fromLocationId: dto.fromLocationId.trim() } : {}),
        ...(dto.toLocationId !== undefined ? { toLocationId: dto.toLocationId.trim() } : {}),
        ...(dto.qty !== undefined ? { qty: new PrismaNs.Decimal(dto.qty) } : {}),
        ...(dto.unitCost !== undefined ? { unitCost: new PrismaNs.Decimal(dto.unitCost) } : {}),
        ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
        updatedBy: user.sub,
      },
      select: TR_ITEM_SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: 'UPDATE',
      entityTable: 'nx03_st_item',
      entityId: itemId,
      entityCode: head.docNo,
      summary: '修改調撥明細',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  async removeItem(user: RequestUser, stId: string, itemId: string) {
    this.ensurePlus(user);
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx03St.findFirst({ where: { id: stId, tenantId }, select: TR_SEL });
    if (!head) throw new NotFoundException('Transfer not found');
    if (head.voidedAt) throw new BadRequestException('Transfer is voided');
    this.assertItemsEditable(head.status);
    const existing = await this.prisma.nx03StItem.findFirst({ where: { id: itemId, stId }, select: TR_ITEM_SEL });
    if (!existing) throw new NotFoundException('Transfer item not found');
    await this.prisma.nx03StItem.delete({ where: { id: itemId } });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: 'DELETE',
      entityTable: 'nx03_st_item',
      entityId: itemId,
      entityCode: head.docNo,
      summary: '刪除調撥明細',
      beforeData: existing as object,
    });
    return { ok: true };
  }
}

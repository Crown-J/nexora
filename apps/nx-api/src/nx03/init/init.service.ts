// apps/nx-api/src/nx03/init/init.service.ts
// NX03 Init service（開帳單、業務員手動建初始庫存、不依賴 NX02 RR）
// 對齊 overview §3.3 開帳業務 + Crown Q-Phase3-1=a 不簽核（D → P 一步到位）
// source=I、partVersionId 過帳時從 nx01_part_version 抓最新 active version（M1 配套）

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
import { applyQtyInWithLedger } from '../../shared/nx03/nx03-inventory';
import { Nx03ListQueryDto } from '../../shared/nx03/nx03-list-query.dto';
import { assertInitStatusTransition, InitStatus } from '../../shared/nx03/nx03-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  CreateInitDto,
  CreateInitItemDto,
  PatchInitItemDto,
  UpdateInitDto,
} from './dto/init.dto';

const INIT_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  warehouseId: true,
  initDate: true,
  status: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  postedAt: true,
  postedBy: true,
  voidedAt: true,
  voidedBy: true,
} as const;

const INIT_ITEM_SEL = {
  id: true,
  initId: true,
  lineNo: true,
  partId: true,
  partNo: true,
  partName: true,
  partVersionId: true,
  locationId: true,
  qty: true,
  unitCost: true,
  totalCost: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

@Injectable()
export class InitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx03ListQueryDto): Prisma.Nx03InitWhereInput {
    const where: Prisma.Nx03InitWhereInput = { tenantId, voidedAt: null };
    if (q.status?.trim()) where.status = q.status.trim();
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { docNo: { contains: s, mode: 'insensitive' } },
        { remark: { contains: s, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  private assertItemsEditable(status: string) {
    if (status !== InitStatus.DRAFT) {
      throw new BadRequestException('Init line items are only editable in DRAFT status');
    }
  }

  private totalCost(qty: PrismaNs.Decimal, unitCost: PrismaNs.Decimal) {
    return qty.mul(unitCost).toDecimalPlaces(2);
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

  private mapDetail(row: { rev_Nx03InitItem_initId: unknown[] } & Record<string, unknown>) {
    const { rev_Nx03InitItem_initId: items, ...rest } = row;
    return { ...rest, items };
  }

  async list(user: RequestUser, q: Nx03ListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx03Init.count({ where }),
      this.prisma.nx03Init.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: INIT_SEL,
      }),
    ]);
    return { page, pageSize, total, items: rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx03Init.findFirst({
      where: { id, tenantId },
      select: {
        ...INIT_SEL,
        rev_Nx03InitItem_initId: { orderBy: { lineNo: 'asc' }, select: INIT_ITEM_SEL },
      },
    });
    if (!row) throw new NotFoundException('Init not found');
    return this.mapDetail(row as never);
  }

  async create(user: RequestUser, dto: CreateInitDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const wh = await tx.nx01Warehouse.findFirst({
        where: { id: dto.warehouseId.trim(), tenantId },
        select: { id: true, code: true },
      });
      if (!wh) throw new BadRequestException('warehouseId invalid');
      const docNo = await allocNx03DocNo(tx, tenantId, 'IN', wh.code);
      const init = await tx.nx03Init.create({
        data: {
          tenantId,
          docNo,
          warehouseId: wh.id,
          initDate: new Date(dto.initDate),
          status: InitStatus.DRAFT,
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: INIT_SEL,
      });
      let line = 1;
      if (dto.items?.length) {
        for (const it of dto.items) {
          await this.addItemTx(tx, user, init, wh.id, line++, it);
        }
      }
      const full = await tx.nx03Init.findFirst({
        where: { id: init.id },
        select: {
          ...INIT_SEL,
          rev_Nx03InitItem_initId: { orderBy: { lineNo: 'asc' }, select: INIT_ITEM_SEL },
        },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: 'CREATE',
        entityTable: 'nx03_init',
        entityId: init.id,
        entityCode: init.docNo,
        summary: '建立開帳單',
        afterData: full as object,
      });
      return this.mapDetail(full as never);
    });
  }

  private async addItemTx(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    init: Prisma.Nx03InitGetPayload<{ select: typeof INIT_SEL }>,
    headerWarehouseId: string,
    lineNo: number,
    it: CreateInitItemDto,
  ) {
    const tenantId = init.tenantId;
    const loc = await tx.nx01Location.findFirst({
      where: { id: it.locationId.trim(), tenantId, warehouseId: headerWarehouseId },
      select: { id: true },
    });
    if (!loc) throw new BadRequestException('locationId must belong to header warehouse');
    const snap = await this.loadPartSnapshot(tx, tenantId, it.partId.trim());
    const partVersionId = await this.loadActivePartVersionId(tx, tenantId, it.partId.trim());
    const qty = new PrismaNs.Decimal(it.qty);
    const unitCost = new PrismaNs.Decimal(it.unitCost);
    await tx.nx03InitItem.create({
      data: {
        initId: init.id,
        lineNo,
        partId: it.partId.trim(),
        partNo: snap.partNo,
        partName: snap.partName,
        partVersionId,
        locationId: it.locationId.trim(),
        qty,
        unitCost,
        totalCost: this.totalCost(qty, unitCost),
        remark: it.remark?.trim() || null,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
    });
  }

  /**
   * 過帳：每明細走 applyQtyInWithLedger（source=I、partVersionId 帶入、M1 配套）
   * Crown Q-Phase3-1=a 不簽核、D → P 一步到位
   */
  private async applyInitPosting(
    tx: Prisma.TransactionClient,
    init: Prisma.Nx03InitGetPayload<{ select: typeof INIT_SEL }>,
    userId: string,
  ) {
    const items = await tx.nx03InitItem.findMany({
      where: { initId: init.id },
      select: { ...INIT_ITEM_SEL },
    });
    if (!items.length) throw new BadRequestException('Init has no items to post');

    for (const item of items) {
      const qtyIn = new PrismaNs.Decimal(item.qty);
      if (qtyIn.lte(0)) continue;
      // schema 允許 locationId nullable、過帳業務上必填（沒庫位無法定位實體位置）
      if (!item.locationId) {
        throw new BadRequestException(
          `Init item ${item.id} (line ${item.lineNo}) missing locationId, cannot post`,
        );
      }
      const unitCost = new PrismaNs.Decimal(item.unitCost);
      await applyQtyInWithLedger(tx, {
        tenantId: init.tenantId,
        userId,
        partId: item.partId,
        warehouseId: init.warehouseId,
        locationId: item.locationId,
        qtyIn,
        unitCost,
        sourceModule: 'NX03',
        sourceDocType: 'I',
        sourceDocId: init.id,
        sourceItemId: item.id,
        partVersionId: item.partVersionId,
      });
    }
  }

  async update(user: RequestUser, id: string, dto: UpdateInitDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx03Init.findFirst({ where: { id, tenantId }, select: INIT_SEL });
    if (!existing) throw new NotFoundException('Init not found');
    if (existing.voidedAt) throw new BadRequestException('Init is voided');

    if (dto.status !== undefined && dto.status !== existing.status) {
      assertInitStatusTransition(existing.status, dto.status);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.status === InitStatus.POSTED && existing.status === InitStatus.DRAFT) {
        const head = await tx.nx03Init.findFirst({ where: { id, tenantId }, select: INIT_SEL });
        if (!head) throw new NotFoundException('Init not found');
        await this.applyInitPosting(tx, head, user.sub);
        await tx.nx03Init.update({
          where: { id },
          data: {
            status: InitStatus.POSTED,
            postedAt: new Date(),
            postedBy: user.sub,
            ...(dto.initDate !== undefined ? { initDate: new Date(dto.initDate) } : {}),
            ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
            updatedBy: user.sub,
          },
        });
      } else {
        await tx.nx03Init.update({
          where: { id },
          data: {
            ...(dto.initDate !== undefined ? { initDate: new Date(dto.initDate) } : {}),
            ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
            ...(dto.status !== undefined ? { status: dto.status } : {}),
            updatedBy: user.sub,
          },
        });
      }
      const full = await tx.nx03Init.findFirst({
        where: { id },
        select: {
          ...INIT_SEL,
          rev_Nx03InitItem_initId: { orderBy: { lineNo: 'asc' }, select: INIT_ITEM_SEL },
        },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: dto.status === InitStatus.POSTED ? 'POST' : 'UPDATE',
        entityTable: 'nx03_init',
        entityId: id,
        entityCode: existing.docNo,
        summary: dto.status === InitStatus.POSTED ? '開帳過帳' : '修改開帳單',
        beforeData: existing as object,
        afterData: full as object,
      });
      return this.mapDetail(full as never);
    });
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx03Init.findFirst({ where: { id, tenantId }, select: INIT_SEL });
    if (!existing) throw new NotFoundException('Init not found');
    if (existing.voidedAt) throw new BadRequestException('Init already voided');
    if (existing.status === InitStatus.POSTED) throw new BadRequestException('Cannot void posted init');
    assertInitStatusTransition(existing.status, InitStatus.VOIDED);
    await this.prisma.nx03Init.update({
      where: { id },
      data: { voidedAt: new Date(), voidedBy: user.sub, status: InitStatus.VOIDED, updatedBy: user.sub },
    });
    const full = await this.prisma.nx03Init.findFirst({
      where: { id },
      select: {
        ...INIT_SEL,
        rev_Nx03InitItem_initId: { orderBy: { lineNo: 'asc' }, select: INIT_ITEM_SEL },
      },
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: 'DELETE',
      entityTable: 'nx03_init',
      entityId: id,
      entityCode: existing.docNo,
      summary: '作廢開帳單',
      beforeData: existing as object,
      afterData: full as object,
    });
    return this.mapDetail(full as never);
  }

  async addItem(user: RequestUser, initId: string, dto: CreateInitItemDto) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx03Init.findFirst({ where: { id: initId, tenantId }, select: INIT_SEL });
    if (!head) throw new NotFoundException('Init not found');
    if (head.voidedAt) throw new BadRequestException('Init is voided');
    this.assertItemsEditable(head.status);
    return this.prisma.$transaction(async (tx) => {
      const maxLine = await tx.nx03InitItem.aggregate({ where: { initId }, _max: { lineNo: true } });
      const lineNo = (maxLine._max.lineNo ?? 0) + 1;
      await this.addItemTx(tx, user, head, head.warehouseId, lineNo, dto);
      const row = await tx.nx03InitItem.findFirst({
        where: { initId, lineNo },
        select: INIT_ITEM_SEL,
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: 'CREATE',
        entityTable: 'nx03_init_item',
        entityId: row!.id,
        entityCode: head.docNo,
        summary: '新增開帳明細',
        afterData: row as object,
      });
      return row;
    });
  }

  async patchItem(user: RequestUser, initId: string, itemId: string, dto: PatchInitItemDto) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx03Init.findFirst({ where: { id: initId, tenantId }, select: INIT_SEL });
    if (!head) throw new NotFoundException('Init not found');
    if (head.voidedAt) throw new BadRequestException('Init is voided');
    this.assertItemsEditable(head.status);
    const existing = await this.prisma.nx03InitItem.findFirst({
      where: { id: itemId, initId },
      select: INIT_ITEM_SEL,
    });
    if (!existing) throw new NotFoundException('Init item not found');

    return this.prisma.$transaction(async (tx) => {
      let partId = existing.partId;
      let partNo = existing.partNo;
      let partName = existing.partName;
      let partVersionId = existing.partVersionId;
      if (dto.partId !== undefined && dto.partId.trim() !== existing.partId) {
        partId = dto.partId.trim();
        const snap = await this.loadPartSnapshot(tx, tenantId, partId);
        partNo = snap.partNo;
        partName = snap.partName;
        partVersionId = await this.loadActivePartVersionId(tx, tenantId, partId);
      }
      let locationId = existing.locationId ?? '';
      if (dto.locationId !== undefined) {
        const loc = await tx.nx01Location.findFirst({
          where: {
            id: dto.locationId.trim(),
            tenantId,
            warehouseId: head.warehouseId,
          },
          select: { id: true },
        });
        if (!loc) throw new BadRequestException('locationId must belong to header warehouse');
        locationId = dto.locationId.trim();
      }
      const qty = dto.qty !== undefined ? new PrismaNs.Decimal(dto.qty) : new PrismaNs.Decimal(existing.qty);
      const unitCost = dto.unitCost !== undefined
        ? new PrismaNs.Decimal(dto.unitCost)
        : new PrismaNs.Decimal(existing.unitCost);
      const row = await tx.nx03InitItem.update({
        where: { id: itemId },
        data: {
          partId,
          partNo,
          partName,
          partVersionId,
          locationId,
          qty,
          unitCost,
          totalCost: this.totalCost(qty, unitCost),
          ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
          updatedBy: user.sub,
        },
        select: INIT_ITEM_SEL,
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: 'UPDATE',
        entityTable: 'nx03_init_item',
        entityId: itemId,
        entityCode: head.docNo,
        summary: '修改開帳明細',
        beforeData: existing as object,
        afterData: row as object,
      });
      return row;
    });
  }

  async removeItem(user: RequestUser, initId: string, itemId: string) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx03Init.findFirst({ where: { id: initId, tenantId }, select: INIT_SEL });
    if (!head) throw new NotFoundException('Init not found');
    if (head.voidedAt) throw new BadRequestException('Init is voided');
    this.assertItemsEditable(head.status);
    const existing = await this.prisma.nx03InitItem.findFirst({
      where: { id: itemId, initId },
      select: INIT_ITEM_SEL,
    });
    if (!existing) throw new NotFoundException('Init item not found');
    await this.prisma.nx03InitItem.delete({ where: { id: itemId } });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: 'DELETE',
      entityTable: 'nx03_init_item',
      entityId: itemId,
      entityCode: head.docNo,
      summary: '刪除開帳明細',
      beforeData: existing as object,
    });
    return { ok: true };
  }
}

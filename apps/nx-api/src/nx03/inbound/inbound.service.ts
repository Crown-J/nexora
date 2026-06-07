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
import {
  assertInboundStatusTransition,
  InboundStatus,
} from '../../shared/nx03/nx03-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreateInboundDto, CreateInboundItemDto, PatchInboundItemDto, UpdateInboundDto } from './dto/inbound.dto';

const IN_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  warehouseId: true,
  inboundDate: true,
  status: true,
  remark: true,
  voidedAt: true,
  voidedBy: true,
  postedAt: true,
  postedBy: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

const IN_ITEM_SEL = {
  id: true,
  inboundId: true,
  lineNo: true,
  partId: true,
  partNo: true,
  partName: true,
  locationId: true,
  qty: true,
  unitCost: true,
  lineAmount: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

@Injectable()
export class InboundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx03ListQueryDto): Prisma.Nx03InboundWhereInput {
    const where: Prisma.Nx03InboundWhereInput = { tenantId, voidedAt: null };
    if (q.status?.trim()) where.status = q.status.trim();
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [{ docNo: { contains: s, mode: 'insensitive' } }, { remark: { contains: s, mode: 'insensitive' } }];
    }
    return where;
  }

  private lineAmount(qty: PrismaNs.Decimal, unit: PrismaNs.Decimal) {
    return qty.mul(unit).toDecimalPlaces(2);
  }

  private assertItemsEditable(status: string) {
    if (status !== InboundStatus.DRAFT && status !== InboundStatus.INSPECTING) {
      throw new BadRequestException('Inbound line items are not editable in current status');
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

  private async applyInboundPosting(
    tx: Prisma.TransactionClient,
    inbound: Prisma.Nx03InboundGetPayload<{ select: typeof IN_SEL }>,
    userId: string,
  ) {
    const items = await tx.nx03InboundItem.findMany({
      where: { inboundId: inbound.id },
      select: { ...IN_ITEM_SEL },
    });
    if (!items.length) throw new BadRequestException('Inbound has no items to post');

    for (const item of items) {
      const qtyIn = new PrismaNs.Decimal(item.qty);
      if (qtyIn.lte(0)) continue;
      const unitCost = new PrismaNs.Decimal(item.unitCost);
      await applyQtyInWithLedger(tx, {
        tenantId: inbound.tenantId,
        userId,
        partId: item.partId,
        warehouseId: inbound.warehouseId,
        locationId: item.locationId,
        qtyIn,
        unitCost,
        sourceModule: 'NX03',
        sourceDocType: 'I',
        sourceDocId: inbound.id,
        sourceItemId: item.id,
      });
    }

    // 02 第四批 軌 3b 2026-06-07：更新 part.lastPurchaseAt（取單據業務日 inboundDate、max 防舊單覆蓋新單）
    const partIds = Array.from(new Set(items.map((it) => it.partId)));
    if (partIds.length > 0) {
      await tx.nx01Part.updateMany({
        where: {
          id: { in: partIds },
          OR: [{ lastPurchaseAt: null }, { lastPurchaseAt: { lt: inbound.inboundDate } }],
        },
        data: { lastPurchaseAt: inbound.inboundDate },
      });
    }
  }

  private mapDetail(row: { rev_Nx03InboundItem_inboundId: unknown[] } & Record<string, unknown>) {
    const { rev_Nx03InboundItem_inboundId: items, ...rest } = row;
    return { ...rest, items };
  }

  async list(user: RequestUser, q: Nx03ListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx03Inbound.count({ where }),
      this.prisma.nx03Inbound.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: IN_SEL,
      }),
    ]);
    return { page, pageSize, total, items: rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx03Inbound.findFirst({
      where: { id, tenantId },
      select: {
        ...IN_SEL,
        rev_Nx03InboundItem_inboundId: { orderBy: { lineNo: 'asc' }, select: IN_ITEM_SEL },
      },
    });
    if (!row) throw new NotFoundException('Inbound not found');
    return this.mapDetail(row as never);
  }

  async create(user: RequestUser, dto: CreateInboundDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const wh = await tx.nx01Warehouse.findFirst({
        where: { id: dto.warehouseId.trim(), tenantId },
        select: { id: true, code: true },
      });
      if (!wh) throw new BadRequestException('warehouseId invalid');
      const docNo = await allocNx03DocNo(tx, tenantId, 'IB', wh.code);
      const inbound = await tx.nx03Inbound.create({
        data: {
          tenantId,
          docNo,
          warehouseId: wh.id,
          inboundDate: new Date(dto.inboundDate),
          status: InboundStatus.DRAFT,
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: IN_SEL,
      });
      let line = 1;
      if (dto.items?.length) {
        for (const it of dto.items) {
          const loc = await tx.nx01Location.findFirst({
            where: { id: it.locationId.trim(), tenantId, warehouseId: wh.id },
            select: { id: true },
          });
          if (!loc) throw new BadRequestException('locationId must belong to inbound warehouse');
          const snap = await this.loadPartSnapshot(tx, tenantId, it.partId.trim());
          const qty = new PrismaNs.Decimal(it.qty);
          const unit = new PrismaNs.Decimal(it.unitCost);
          await tx.nx03InboundItem.create({
            data: {
              inboundId: inbound.id,
              lineNo: line++,
              partId: it.partId.trim(),
              partNo: snap.partNo,
              partName: snap.partName,
              locationId: it.locationId.trim(),
              qty,
              unitCost: unit,
              lineAmount: this.lineAmount(qty, unit),
              remark: it.remark?.trim() || null,
              createdBy: user.sub,
              updatedBy: user.sub,
            },
          });
        }
      }
      const full = await tx.nx03Inbound.findFirst({
        where: { id: inbound.id },
        select: {
          ...IN_SEL,
          rev_Nx03InboundItem_inboundId: { orderBy: { lineNo: 'asc' }, select: IN_ITEM_SEL },
        },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: 'CREATE',
        entityTable: 'nx03_inbound',
        entityId: inbound.id,
        entityCode: inbound.docNo,
        summary: '建立入庫單',
        afterData: full as object,
      });
      return this.mapDetail(full as never);
    });
  }

  async update(user: RequestUser, id: string, dto: UpdateInboundDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx03Inbound.findFirst({ where: { id, tenantId }, select: IN_SEL });
    if (!existing) throw new NotFoundException('Inbound not found');
    if (existing.voidedAt) throw new BadRequestException('Inbound is voided');

    if (dto.status !== undefined && dto.status !== existing.status) {
      assertInboundStatusTransition(existing.status, dto.status);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.status === InboundStatus.POSTED && existing.status === InboundStatus.INSPECTING) {
        const head = await tx.nx03Inbound.findFirst({ where: { id, tenantId }, select: IN_SEL });
        if (!head) throw new NotFoundException('Inbound not found');
        await this.applyInboundPosting(tx, head, user.sub);
        await tx.nx03Inbound.update({
          where: { id },
          data: {
            status: InboundStatus.POSTED,
            postedAt: new Date(),
            postedBy: user.sub,
            ...(dto.inboundDate !== undefined ? { inboundDate: new Date(dto.inboundDate) } : {}),
            ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
            updatedBy: user.sub,
          },
        });
      } else {
        await tx.nx03Inbound.update({
          where: { id },
          data: {
            ...(dto.inboundDate !== undefined ? { inboundDate: new Date(dto.inboundDate) } : {}),
            ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
            ...(dto.status !== undefined ? { status: dto.status } : {}),
            updatedBy: user.sub,
          },
        });
      }
      const full = await tx.nx03Inbound.findFirst({
        where: { id },
        select: {
          ...IN_SEL,
          rev_Nx03InboundItem_inboundId: { orderBy: { lineNo: 'asc' }, select: IN_ITEM_SEL },
        },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: dto.status === InboundStatus.POSTED ? 'POST' : 'UPDATE',
        entityTable: 'nx03_inbound',
        entityId: id,
        entityCode: existing.docNo,
        summary: dto.status === InboundStatus.POSTED ? '入庫過帳' : '修改入庫單',
        beforeData: existing as object,
        afterData: full as object,
      });
      return this.mapDetail(full as never);
    });
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx03Inbound.findFirst({ where: { id, tenantId }, select: IN_SEL });
    if (!existing) throw new NotFoundException('Inbound not found');
    if (existing.voidedAt) throw new BadRequestException('Inbound already voided');
    if (existing.status === InboundStatus.POSTED) throw new BadRequestException('Cannot void posted inbound');
    assertInboundStatusTransition(existing.status, InboundStatus.CANCELLED);
    await this.prisma.nx03Inbound.update({
      where: { id },
      data: { voidedAt: new Date(), voidedBy: user.sub, status: InboundStatus.CANCELLED, updatedBy: user.sub },
    });
    const full = await this.prisma.nx03Inbound.findFirst({
      where: { id },
      select: {
        ...IN_SEL,
        rev_Nx03InboundItem_inboundId: { orderBy: { lineNo: 'asc' }, select: IN_ITEM_SEL },
      },
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: 'DELETE',
      entityTable: 'nx03_inbound',
      entityId: id,
      entityCode: existing.docNo,
      summary: '作廢入庫單',
      beforeData: existing as object,
      afterData: full as object,
    });
    return this.mapDetail(full as never);
  }

  async addItem(user: RequestUser, inboundId: string, dto: CreateInboundItemDto) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx03Inbound.findFirst({ where: { id: inboundId, tenantId }, select: IN_SEL });
    if (!head) throw new NotFoundException('Inbound not found');
    if (head.voidedAt) throw new BadRequestException('Inbound is voided');
    this.assertItemsEditable(head.status);
    const loc = await this.prisma.nx01Location.findFirst({
      where: { id: dto.locationId.trim(), tenantId, warehouseId: head.warehouseId },
      select: { id: true },
    });
    if (!loc) throw new BadRequestException('locationId must belong to inbound warehouse');
    const snap = await this.loadPartSnapshot(this.prisma, tenantId, dto.partId.trim());
    const maxLine = await this.prisma.nx03InboundItem.aggregate({ where: { inboundId }, _max: { lineNo: true } });
    const lineNo = (maxLine._max.lineNo ?? 0) + 1;
    const qty = new PrismaNs.Decimal(dto.qty);
    const unit = new PrismaNs.Decimal(dto.unitCost);
    const row = await this.prisma.nx03InboundItem.create({
      data: {
        inboundId,
        lineNo,
        partId: dto.partId.trim(),
        partNo: snap.partNo,
        partName: snap.partName,
        locationId: dto.locationId.trim(),
        qty,
        unitCost: unit,
        lineAmount: this.lineAmount(qty, unit),
        remark: dto.remark?.trim() || null,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: IN_ITEM_SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: 'CREATE',
      entityTable: 'nx03_inbound_item',
      entityId: row.id,
      entityCode: head.docNo,
      summary: '新增入庫明細',
      afterData: row as object,
    });
    return row;
  }

  async patchItem(user: RequestUser, inboundId: string, itemId: string, dto: PatchInboundItemDto) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx03Inbound.findFirst({ where: { id: inboundId, tenantId }, select: IN_SEL });
    if (!head) throw new NotFoundException('Inbound not found');
    if (head.voidedAt) throw new BadRequestException('Inbound is voided');
    this.assertItemsEditable(head.status);
    const existing = await this.prisma.nx03InboundItem.findFirst({ where: { id: itemId, inboundId }, select: IN_ITEM_SEL });
    if (!existing) throw new NotFoundException('Inbound item not found');
    if (dto.locationId !== undefined) {
      const loc = await this.prisma.nx01Location.findFirst({
        where: { id: dto.locationId.trim(), tenantId, warehouseId: head.warehouseId },
        select: { id: true },
      });
      if (!loc) throw new BadRequestException('locationId must belong to inbound warehouse');
    }
    let partNo = existing.partNo;
    let partName = existing.partName;
    if (dto.partId !== undefined) {
      const snap = await this.loadPartSnapshot(this.prisma, tenantId, dto.partId.trim());
      partNo = snap.partNo;
      partName = snap.partName;
    }
    const qty = dto.qty !== undefined ? new PrismaNs.Decimal(dto.qty) : new PrismaNs.Decimal(existing.qty);
    const unit = dto.unitCost !== undefined ? new PrismaNs.Decimal(dto.unitCost) : new PrismaNs.Decimal(existing.unitCost);
    const row = await this.prisma.nx03InboundItem.update({
      where: { id: itemId },
      data: {
        ...(dto.partId !== undefined ? { partId: dto.partId.trim(), partNo, partName } : {}),
        ...(dto.locationId !== undefined ? { locationId: dto.locationId.trim() } : {}),
        qty,
        unitCost: unit,
        lineAmount: this.lineAmount(qty, unit),
        ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
        updatedBy: user.sub,
      },
      select: IN_ITEM_SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: 'UPDATE',
      entityTable: 'nx03_inbound_item',
      entityId: itemId,
      entityCode: head.docNo,
      summary: '修改入庫明細',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  async removeItem(user: RequestUser, inboundId: string, itemId: string) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx03Inbound.findFirst({ where: { id: inboundId, tenantId }, select: IN_SEL });
    if (!head) throw new NotFoundException('Inbound not found');
    if (head.voidedAt) throw new BadRequestException('Inbound is voided');
    this.assertItemsEditable(head.status);
    const existing = await this.prisma.nx03InboundItem.findFirst({ where: { id: itemId, inboundId }, select: IN_ITEM_SEL });
    if (!existing) throw new NotFoundException('Inbound item not found');
    await this.prisma.nx03InboundItem.delete({ where: { id: itemId } });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: 'DELETE',
      entityTable: 'nx03_inbound_item',
      entityId: itemId,
      entityCode: head.docNo,
      summary: '刪除入庫明細',
      beforeData: existing as object,
    });
    return { ok: true };
  }
}

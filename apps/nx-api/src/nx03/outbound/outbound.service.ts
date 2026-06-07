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
import { applyQtyOutWithLedger } from '../../shared/nx03/nx03-inventory';
import { Nx03ListQueryDto } from '../../shared/nx03/nx03-list-query.dto';
import {
  assertOutboundStatusTransition,
  OutboundStatus,
} from '../../shared/nx03/nx03-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreateOutboundDto, CreateOutboundItemDto, PatchOutboundItemDto, UpdateOutboundDto } from './dto/outbound.dto';

const OB_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  warehouseId: true,
  outboundDate: true,
  status: true,
  remark: true,
  voidedAt: true,
  voidedBy: true,
  shippedAt: true,
  shippedBy: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

const OB_ITEM_SEL = {
  id: true,
  outboundId: true,
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
export class OutboundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx03ListQueryDto): Prisma.Nx03OutboundWhereInput {
    const where: Prisma.Nx03OutboundWhereInput = { tenantId, voidedAt: null };
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
    if (
      status !== OutboundStatus.DRAFT &&
      status !== OutboundStatus.PICKING &&
      status !== OutboundStatus.PACKED
    ) {
      throw new BadRequestException('Outbound line items are not editable in current status');
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

  private async resolveItemUnitCost(
    tx: Prisma.TransactionClient,
    tenantId: string,
    warehouseId: string,
    partId: string,
    dtoUnit?: number,
  ): Promise<PrismaNs.Decimal> {
    if (dtoUnit != null && dtoUnit >= 0) return new PrismaNs.Decimal(dtoUnit);
    const bal = await tx.nx03StockBalance.findFirst({
      where: { tenantId, partId, warehouseId },
      select: { avgCost: true },
    });
    if (!bal) return new PrismaNs.Decimal(0);
    return new PrismaNs.Decimal(bal.avgCost);
  }

  private async applyOutboundShipping(
    tx: Prisma.TransactionClient,
    ob: Prisma.Nx03OutboundGetPayload<{ select: typeof OB_SEL }>,
    userId: string,
  ) {
    const items = await tx.nx03OutboundItem.findMany({
      where: { outboundId: ob.id },
      select: { ...OB_ITEM_SEL },
    });
    if (!items.length) throw new BadRequestException('Outbound has no items to ship');

    for (const item of items) {
      const qtyOut = new PrismaNs.Decimal(item.qty);
      if (qtyOut.lte(0)) continue;
      await applyQtyOutWithLedger(tx, {
        tenantId: ob.tenantId,
        userId,
        partId: item.partId,
        warehouseId: ob.warehouseId,
        locationId: item.locationId,
        qtyOut,
        sourceModule: 'NX03',
        sourceDocType: 'O',
        sourceDocId: ob.id,
        sourceItemId: item.id,
      });
    }

    // 02 第四批 軌 3b 2026-06-07：更新 part.lastSaleAt（取單據業務日 outboundDate、max 防舊單覆蓋新單）
    const partIds = Array.from(new Set(items.map((it) => it.partId)));
    if (partIds.length > 0) {
      await tx.nx01Part.updateMany({
        where: {
          id: { in: partIds },
          OR: [{ lastSaleAt: null }, { lastSaleAt: { lt: ob.outboundDate } }],
        },
        data: { lastSaleAt: ob.outboundDate },
      });
    }
  }

  private mapDetail(row: { rev_Nx03OutboundItem_outboundId: unknown[] } & Record<string, unknown>) {
    const { rev_Nx03OutboundItem_outboundId: items, ...rest } = row;
    return { ...rest, items };
  }

  async list(user: RequestUser, q: Nx03ListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx03Outbound.count({ where }),
      this.prisma.nx03Outbound.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: OB_SEL,
      }),
    ]);
    return { page, pageSize, total, items: rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx03Outbound.findFirst({
      where: { id, tenantId },
      select: {
        ...OB_SEL,
        rev_Nx03OutboundItem_outboundId: { orderBy: { lineNo: 'asc' }, select: OB_ITEM_SEL },
      },
    });
    if (!row) throw new NotFoundException('Outbound not found');
    return this.mapDetail(row as never);
  }

  async create(user: RequestUser, dto: CreateOutboundDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const wh = await tx.nx01Warehouse.findFirst({
        where: { id: dto.warehouseId.trim(), tenantId },
        select: { id: true, code: true },
      });
      if (!wh) throw new BadRequestException('warehouseId invalid');
      const docNo = await allocNx03DocNo(tx, tenantId, 'OB', wh.code);
      const outbound = await tx.nx03Outbound.create({
        data: {
          tenantId,
          docNo,
          warehouseId: wh.id,
          outboundDate: new Date(dto.outboundDate),
          status: OutboundStatus.DRAFT,
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: OB_SEL,
      });
      let line = 1;
      if (dto.items?.length) {
        for (const it of dto.items) {
          const loc = await tx.nx01Location.findFirst({
            where: { id: it.locationId.trim(), tenantId, warehouseId: wh.id },
            select: { id: true },
          });
          if (!loc) throw new BadRequestException('locationId must belong to outbound warehouse');
          const snap = await this.loadPartSnapshot(tx, tenantId, it.partId.trim());
          const qty = new PrismaNs.Decimal(it.qty);
          const unit = await this.resolveItemUnitCost(tx, tenantId, wh.id, it.partId.trim(), it.unitCost);
          await tx.nx03OutboundItem.create({
            data: {
              outboundId: outbound.id,
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
      const full = await tx.nx03Outbound.findFirst({
        where: { id: outbound.id },
        select: {
          ...OB_SEL,
          rev_Nx03OutboundItem_outboundId: { orderBy: { lineNo: 'asc' }, select: OB_ITEM_SEL },
        },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: 'CREATE',
        entityTable: 'nx03_outbound',
        entityId: outbound.id,
        entityCode: outbound.docNo,
        summary: '建立出庫單',
        afterData: full as object,
      });
      return this.mapDetail(full as never);
    });
  }

  async update(user: RequestUser, id: string, dto: UpdateOutboundDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx03Outbound.findFirst({ where: { id, tenantId }, select: OB_SEL });
    if (!existing) throw new NotFoundException('Outbound not found');
    if (existing.voidedAt) throw new BadRequestException('Outbound is voided');

    if (dto.status !== undefined && dto.status !== existing.status) {
      assertOutboundStatusTransition(existing.status, dto.status);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.status === OutboundStatus.SHIPPED && existing.status === OutboundStatus.PACKED) {
        const head = await tx.nx03Outbound.findFirst({ where: { id, tenantId }, select: OB_SEL });
        if (!head) throw new NotFoundException('Outbound not found');
        await this.applyOutboundShipping(tx, head, user.sub);
        await tx.nx03Outbound.update({
          where: { id },
          data: {
            status: OutboundStatus.SHIPPED,
            shippedAt: new Date(),
            shippedBy: user.sub,
            ...(dto.outboundDate !== undefined ? { outboundDate: new Date(dto.outboundDate) } : {}),
            ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
            updatedBy: user.sub,
          },
        });
      } else {
        await tx.nx03Outbound.update({
          where: { id },
          data: {
            ...(dto.outboundDate !== undefined ? { outboundDate: new Date(dto.outboundDate) } : {}),
            ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
            ...(dto.status !== undefined ? { status: dto.status } : {}),
            updatedBy: user.sub,
          },
        });
      }
      const full = await tx.nx03Outbound.findFirst({
        where: { id },
        select: {
          ...OB_SEL,
          rev_Nx03OutboundItem_outboundId: { orderBy: { lineNo: 'asc' }, select: OB_ITEM_SEL },
        },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: dto.status === OutboundStatus.SHIPPED ? 'POST' : 'UPDATE',
        entityTable: 'nx03_outbound',
        entityId: id,
        entityCode: existing.docNo,
        summary: dto.status === OutboundStatus.SHIPPED ? '出庫結案(SHIPPED)' : '修改出庫單',
        beforeData: existing as object,
        afterData: full as object,
      });
      return this.mapDetail(full as never);
    });
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx03Outbound.findFirst({ where: { id, tenantId }, select: OB_SEL });
    if (!existing) throw new NotFoundException('Outbound not found');
    if (existing.voidedAt) throw new BadRequestException('Outbound already voided');
    if (existing.status === OutboundStatus.SHIPPED) throw new BadRequestException('Cannot void shipped outbound');
    assertOutboundStatusTransition(existing.status, OutboundStatus.CANCELLED);
    await this.prisma.nx03Outbound.update({
      where: { id },
      data: { voidedAt: new Date(), voidedBy: user.sub, status: OutboundStatus.CANCELLED, updatedBy: user.sub },
    });
    const full = await this.prisma.nx03Outbound.findFirst({
      where: { id },
      select: {
        ...OB_SEL,
        rev_Nx03OutboundItem_outboundId: { orderBy: { lineNo: 'asc' }, select: OB_ITEM_SEL },
      },
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: 'DELETE',
      entityTable: 'nx03_outbound',
      entityId: id,
      entityCode: existing.docNo,
      summary: '作廢出庫單',
      beforeData: existing as object,
      afterData: full as object,
    });
    return this.mapDetail(full as never);
  }

  async addItem(user: RequestUser, outboundId: string, dto: CreateOutboundItemDto) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx03Outbound.findFirst({ where: { id: outboundId, tenantId }, select: OB_SEL });
    if (!head) throw new NotFoundException('Outbound not found');
    if (head.voidedAt) throw new BadRequestException('Outbound is voided');
    this.assertItemsEditable(head.status);
    const loc = await this.prisma.nx01Location.findFirst({
      where: { id: dto.locationId.trim(), tenantId, warehouseId: head.warehouseId },
      select: { id: true },
    });
    if (!loc) throw new BadRequestException('locationId must belong to outbound warehouse');
    const snap = await this.loadPartSnapshot(this.prisma, tenantId, dto.partId.trim());
    const maxLine = await this.prisma.nx03OutboundItem.aggregate({ where: { outboundId }, _max: { lineNo: true } });
    const lineNo = (maxLine._max.lineNo ?? 0) + 1;
    const qty = new PrismaNs.Decimal(dto.qty);
    const unit = await this.resolveItemUnitCost(this.prisma, tenantId, head.warehouseId, dto.partId.trim(), dto.unitCost);
    const row = await this.prisma.nx03OutboundItem.create({
      data: {
        outboundId,
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
      select: OB_ITEM_SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: 'CREATE',
      entityTable: 'nx03_outbound_item',
      entityId: row.id,
      entityCode: head.docNo,
      summary: '新增出庫明細',
      afterData: row as object,
    });
    return row;
  }

  async patchItem(user: RequestUser, outboundId: string, itemId: string, dto: PatchOutboundItemDto) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx03Outbound.findFirst({ where: { id: outboundId, tenantId }, select: OB_SEL });
    if (!head) throw new NotFoundException('Outbound not found');
    if (head.voidedAt) throw new BadRequestException('Outbound is voided');
    this.assertItemsEditable(head.status);
    const existing = await this.prisma.nx03OutboundItem.findFirst({ where: { id: itemId, outboundId }, select: OB_ITEM_SEL });
    if (!existing) throw new NotFoundException('Outbound item not found');
    if (dto.locationId !== undefined) {
      const loc = await this.prisma.nx01Location.findFirst({
        where: { id: dto.locationId.trim(), tenantId, warehouseId: head.warehouseId },
        select: { id: true },
      });
      if (!loc) throw new BadRequestException('locationId must belong to outbound warehouse');
    }
    let partNo = existing.partNo;
    let partName = existing.partName;
    const partId = dto.partId !== undefined ? dto.partId.trim() : existing.partId;
    if (dto.partId !== undefined) {
      const snap = await this.loadPartSnapshot(this.prisma, tenantId, partId);
      partNo = snap.partNo;
      partName = snap.partName;
    }
    const qty = dto.qty !== undefined ? new PrismaNs.Decimal(dto.qty) : new PrismaNs.Decimal(existing.qty);
    const unit =
      dto.unitCost !== undefined
        ? new PrismaNs.Decimal(dto.unitCost)
        : dto.partId !== undefined || dto.qty !== undefined
          ? await this.resolveItemUnitCost(this.prisma, tenantId, head.warehouseId, partId, undefined)
          : new PrismaNs.Decimal(existing.unitCost);
    const row = await this.prisma.nx03OutboundItem.update({
      where: { id: itemId },
      data: {
        ...(dto.partId !== undefined ? { partId, partNo, partName } : {}),
        ...(dto.locationId !== undefined ? { locationId: dto.locationId.trim() } : {}),
        qty,
        unitCost: unit,
        lineAmount: this.lineAmount(qty, unit),
        ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
        updatedBy: user.sub,
      },
      select: OB_ITEM_SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: 'UPDATE',
      entityTable: 'nx03_outbound_item',
      entityId: itemId,
      entityCode: head.docNo,
      summary: '修改出庫明細',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  async removeItem(user: RequestUser, outboundId: string, itemId: string) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx03Outbound.findFirst({ where: { id: outboundId, tenantId }, select: OB_SEL });
    if (!head) throw new NotFoundException('Outbound not found');
    if (head.voidedAt) throw new BadRequestException('Outbound is voided');
    this.assertItemsEditable(head.status);
    const existing = await this.prisma.nx03OutboundItem.findFirst({ where: { id: itemId, outboundId }, select: OB_ITEM_SEL });
    if (!existing) throw new NotFoundException('Outbound item not found');
    await this.prisma.nx03OutboundItem.delete({ where: { id: itemId } });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: 'DELETE',
      entityTable: 'nx03_outbound_item',
      entityId: itemId,
      entityCode: head.docNo,
      summary: '刪除出庫明細',
      beforeData: existing as object,
    });
    return { ok: true };
  }
}

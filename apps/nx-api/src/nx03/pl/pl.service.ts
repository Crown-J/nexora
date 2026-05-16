// apps/nx-api/src/nx03/pl/pl.service.ts
// NX03 Pl service（包貨單、從 Pk 自動轉 items）
// 對齊 overview §5.3 包貨單 = 1 對 N 包裹拆分（parcelId 在 commit 6 連動）
// status flow: P → C → F → S（已寄出）+ V

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
import { Nx03ListQueryDto } from '../../shared/nx03/nx03-list-query.dto';
import { assertPlStatusTransition, PkStatus, PlStatus } from '../../shared/nx03/nx03-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreatePlDto, PatchPlItemDto, UpdatePlDto } from './dto/pl.dto';

const PL_SEL = {
  id: true,
  tenantId: true,
  warehouseId: true,
  docNo: true,
  plDate: true,
  pkId: true,
  plType: true,
  status: true,
  logisticsProvider: true,
  logisticsTrackingNo: true,
  shippedAt: true,
  shippedBy: true,
  startedAt: true,
  completedAt: true,
  completedBy: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

const PL_ITEM_SEL = {
  id: true,
  plId: true,
  parcelId: true,
  pkItemId: true,
  lineNo: true,
  partId: true,
  partNo: true,
  partName: true,
  qty: true,
  remark: true,
  createdAt: true,
  updatedAt: true,
  updatedBy: true,
} as const;

@Injectable()
export class PlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx03ListQueryDto): Prisma.Nx03PlWhereInput {
    const where: Prisma.Nx03PlWhereInput = { tenantId };
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
    if (status !== PlStatus.PENDING && status !== PlStatus.COUNTING) {
      throw new BadRequestException('Pl line items are only editable in P/C status');
    }
  }

  async list(user: RequestUser, q: Nx03ListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx03Pl.count({ where }),
      this.prisma.nx03Pl.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: PL_SEL,
      }),
    ]);
    return { page, pageSize, total, items: rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx03Pl.findFirst({
      where: { id, tenantId },
      select: {
        ...PL_SEL,
        rev_Nx03PlItem_plId: { orderBy: { lineNo: 'asc' }, select: PL_ITEM_SEL },
      },
    });
    if (!row) throw new NotFoundException('Pl not found');
    const { rev_Nx03PlItem_plId, ...rest } = row;
    return { ...rest, items: rev_Nx03PlItem_plId };
  }

  /**
   * 建包貨單：從 Pk 自動拉 items（按 pkItem 1:1 對應 plItem）
   * - Pk 必須 status=F 已完成（撿貨完才能包貨）
   * - plType 應對齊 Pk.deliveryType（business 一致性、application 校驗）
   * - parcelId 留 null（commit 6 Parcel 階段才連動）
   */
  async create(user: RequestUser, dto: CreatePlDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const pk = await tx.nx03Pk.findFirst({
        where: { id: dto.pkId.trim(), tenantId },
        select: {
          id: true,
          warehouseId: true,
          status: true,
          deliveryType: true,
          warehouse: { select: { code: true } },
        },
      });
      if (!pk) throw new BadRequestException('pkId invalid');
      if (pk.status !== PkStatus.FINISHED) {
        throw new BadRequestException(`Pk status must be F (FINISHED) to build Pl, got '${pk.status}'`);
      }
      if (pk.deliveryType !== dto.plType) {
        throw new BadRequestException(
          `plType '${dto.plType}' must match pk.deliveryType '${pk.deliveryType}'`,
        );
      }
      const docNo = await allocNx03DocNo(tx, tenantId, 'PL', pk.warehouse.code);
      const pl = await tx.nx03Pl.create({
        data: {
          tenantId,
          warehouseId: pk.warehouseId,
          docNo,
          plDate: new Date(dto.plDate),
          pkId: pk.id,
          plType: dto.plType,
          status: PlStatus.PENDING,
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: PL_SEL,
      });
      // 從 Pk 拉 items、按 pkItem 1:1 對應 plItem
      const pkItems = await tx.nx03PkItem.findMany({
        where: { pkId: pk.id, status: 'C' }, // 只拉已完成撿貨的 items（M 找不到貨 / P 待撿不拉）
        orderBy: { lineNo: 'asc' },
        select: { id: true, partId: true, partNo: true, partName: true, qty: true },
      });
      let line = 1;
      for (const pkItem of pkItems) {
        await tx.nx03PlItem.create({
          data: {
            plId: pl.id,
            parcelId: null, // commit 6 連動
            pkItemId: pkItem.id,
            lineNo: line++,
            partId: pkItem.partId,
            partNo: pkItem.partNo,
            partName: pkItem.partName,
            qty: pkItem.qty,
            updatedBy: user.sub,
          },
        });
      }
      const full = await tx.nx03Pl.findFirst({
        where: { id: pl.id },
        select: { ...PL_SEL, rev_Nx03PlItem_plId: { orderBy: { lineNo: 'asc' }, select: PL_ITEM_SEL } },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: 'CREATE',
        entityTable: 'nx03_pl',
        entityId: pl.id,
        entityCode: pl.docNo,
        summary: `建立包貨單（從 Pk ${pk.id} 自動轉 ${pkItems.length} items）`,
        afterData: full as object,
      });
      const { rev_Nx03PlItem_plId, ...rest } = full!;
      return { ...rest, items: rev_Nx03PlItem_plId };
    });
  }

  async update(user: RequestUser, id: string, dto: UpdatePlDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx03Pl.findFirst({ where: { id, tenantId }, select: PL_SEL });
    if (!existing) throw new NotFoundException('Pl not found');
    if (existing.status === PlStatus.VOIDED) throw new BadRequestException('Pl is voided');

    if (dto.status !== undefined && dto.status !== existing.status) {
      assertPlStatusTransition(existing.status, dto.status);
    }

    return this.prisma.$transaction(async (tx) => {
      const extra: Prisma.Nx03PlUpdateInput = {};
      // P → C：包貨啟動
      if (dto.status === PlStatus.COUNTING && existing.status === PlStatus.PENDING) {
        extra.startedAt = new Date();
      }
      // C → F：包貨完成
      if (dto.status === PlStatus.FINISHED && existing.status === PlStatus.COUNTING) {
        extra.completedAt = new Date();
        extra.completedBy = user.sub;
      }
      // F → S：已寄出（寄貨流程）
      if (dto.status === PlStatus.SHIPPED && existing.status === PlStatus.FINISHED) {
        if (!dto.logisticsTrackingNo?.trim()) {
          throw new BadRequestException('logisticsTrackingNo is required when transitioning to S (SHIPPED)');
        }
        extra.shippedAt = new Date();
        extra.shippedBy = user.sub;
      }
      await tx.nx03Pl.update({
        where: { id },
        data: {
          ...(dto.plDate !== undefined ? { plDate: new Date(dto.plDate) } : {}),
          ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.logisticsProvider !== undefined ? { logisticsProvider: dto.logisticsProvider } : {}),
          ...(dto.logisticsTrackingNo !== undefined ? { logisticsTrackingNo: dto.logisticsTrackingNo } : {}),
          ...extra,
          updatedBy: user.sub,
        },
      });
      const full = await tx.nx03Pl.findFirst({
        where: { id },
        select: { ...PL_SEL, rev_Nx03PlItem_plId: { orderBy: { lineNo: 'asc' }, select: PL_ITEM_SEL } },
      });
      const action =
        dto.status === PlStatus.SHIPPED
          ? 'SHIP'
          : dto.status === PlStatus.FINISHED
            ? 'FINISH'
            : 'UPDATE';
      const summary =
        dto.status === PlStatus.SHIPPED
          ? '寄出包貨單'
          : dto.status === PlStatus.FINISHED
            ? '包貨完成'
            : '修改包貨單';
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action,
        entityTable: 'nx03_pl',
        entityId: id,
        entityCode: existing.docNo,
        summary,
        beforeData: existing as object,
        afterData: full as object,
      });
      const { rev_Nx03PlItem_plId, ...rest } = full!;
      return { ...rest, items: rev_Nx03PlItem_plId };
    });
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx03Pl.findFirst({ where: { id, tenantId }, select: PL_SEL });
    if (!existing) throw new NotFoundException('Pl not found');
    if (existing.status === PlStatus.VOIDED) throw new BadRequestException('Already voided');
    if (existing.status === PlStatus.FINISHED || existing.status === PlStatus.SHIPPED) {
      throw new BadRequestException('Cannot void finished/shipped Pl');
    }
    assertPlStatusTransition(existing.status, PlStatus.VOIDED);
    await this.prisma.nx03Pl.update({
      where: { id },
      data: { status: PlStatus.VOIDED, updatedBy: user.sub },
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: 'DELETE',
      entityTable: 'nx03_pl',
      entityId: id,
      entityCode: existing.docNo,
      summary: '作廢包貨單',
      beforeData: existing as object,
    });
    return { ok: true };
  }

  async patchItem(user: RequestUser, plId: string, itemId: string, dto: PatchPlItemDto) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx03Pl.findFirst({ where: { id: plId, tenantId }, select: PL_SEL });
    if (!head) throw new NotFoundException('Pl not found');
    this.assertItemsEditable(head.status);
    const existing = await this.prisma.nx03PlItem.findFirst({
      where: { id: itemId, plId },
      select: PL_ITEM_SEL,
    });
    if (!existing) throw new NotFoundException('Pl item not found');

    // parcelId 校驗：必須屬於同一 Pl
    if (dto.parcelId !== undefined && dto.parcelId !== null) {
      const parcel = await this.prisma.nx03Parcel.findFirst({
        where: { id: dto.parcelId.trim(), plId, tenantId },
        select: { id: true },
      });
      if (!parcel) throw new BadRequestException('parcelId not found or not belong to this Pl');
    }

    const row = await this.prisma.nx03PlItem.update({
      where: { id: itemId },
      data: {
        ...(dto.parcelId !== undefined ? { parcelId: dto.parcelId } : {}),
        ...(dto.qty !== undefined ? { qty: new PrismaNs.Decimal(dto.qty) } : {}),
        ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
        updatedBy: user.sub,
      },
      select: PL_ITEM_SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: 'UPDATE',
      entityTable: 'nx03_pl_item',
      entityId: itemId,
      entityCode: head.docNo,
      summary: '修改包貨明細',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }
}

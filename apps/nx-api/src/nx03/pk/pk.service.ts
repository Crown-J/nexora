// apps/nx-api/src/nx03/pk/pk.service.ts
// NX03 Pk service（撿貨單、business 本質 = 待辦工作清單、不寫 ledger）
// 對齊 overview §5.2 撿貨單 = 業務動作集中表
// triggerSource S=銷貨單SO / T=調撥單ST（Q-MV1=B 退貨不走撿包）
// 不寫 ledger、實際 SO/ST 過帳由各自 service 走 helper

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
import { assertPkStatusTransition, PkStatus } from '../../shared/nx03/nx03-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type { CreatePkDto, CreatePkItemDto, PatchPkItemDto, UpdatePkDto } from './dto/pk.dto';

const PK_SEL = {
  id: true,
  tenantId: true,
  warehouseId: true,
  docNo: true,
  pkDate: true,
  triggerSource: true,
  deliveryType: true,
  status: true,
  pickupCode: true,
  startedAt: true,
  completedAt: true,
  completedBy: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

const PK_ITEM_SEL = {
  id: true,
  pkId: true,
  refSoId: true,
  refSoItemId: true,
  refStId: true,
  lineNo: true,
  partId: true,
  partNo: true,
  partName: true,
  locationId: true,
  qty: true,
  status: true,
  notFoundReason: true,
  labelChecked: true,
  createdAt: true,
  updatedAt: true,
  updatedBy: true,
} as const;

@Injectable()
export class PkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx03ListQueryDto): Prisma.Nx03PkWhereInput {
    const where: Prisma.Nx03PkWhereInput = { tenantId };
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

  /** 撿貨單 line items 編輯範圍：P/C 階段可編、F/V 鎖死。 */
  private assertItemsEditable(status: string) {
    if (status !== PkStatus.PENDING && status !== PkStatus.COUNTING) {
      throw new BadRequestException('Pk line items are only editable in P/C status');
    }
  }

  /** 校驗 triggerSource vs item ref 一致性。 */
  private assertItemRefConsistency(triggerSource: 'S' | 'T', it: CreatePkItemDto) {
    if (triggerSource === 'S') {
      if (!it.refSoId || !it.refSoItemId) {
        throw new BadRequestException('triggerSource=S: refSoId + refSoItemId 必填');
      }
      if (it.refStId) {
        throw new BadRequestException('triggerSource=S: refStId 必空');
      }
    } else {
      if (!it.refStId) throw new BadRequestException('triggerSource=T: refStId 必填');
      if (it.refSoId || it.refSoItemId) {
        throw new BadRequestException('triggerSource=T: refSoId/refSoItemId 必空');
      }
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

  async list(user: RequestUser, q: Nx03ListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx03Pk.count({ where }),
      this.prisma.nx03Pk.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: PK_SEL,
      }),
    ]);
    return { page, pageSize, total, items: rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx03Pk.findFirst({
      where: { id, tenantId },
      select: {
        ...PK_SEL,
        rev_Nx03PkItem_pkId: { orderBy: { lineNo: 'asc' }, select: PK_ITEM_SEL },
      },
    });
    if (!row) throw new NotFoundException('Pk not found');
    const { rev_Nx03PkItem_pkId, ...rest } = row;
    return { ...rest, items: rev_Nx03PkItem_pkId };
  }

  async create(user: RequestUser, dto: CreatePkDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const wh = await tx.nx01Warehouse.findFirst({
        where: { id: dto.warehouseId.trim(), tenantId },
        select: { id: true, code: true },
      });
      if (!wh) throw new BadRequestException('warehouseId invalid');
      const docNo = await allocNx03DocNo(tx, tenantId, 'PK', wh.code);
      const pk = await tx.nx03Pk.create({
        data: {
          tenantId,
          warehouseId: wh.id,
          docNo,
          pkDate: new Date(dto.pkDate),
          triggerSource: dto.triggerSource,
          deliveryType: dto.deliveryType,
          status: PkStatus.PENDING,
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: PK_SEL,
      });
      let line = 1;
      if (dto.items?.length) {
        for (const it of dto.items) {
          await this.addItemTx(tx, user, pk, wh.id, line++, it);
        }
      }
      const full = await tx.nx03Pk.findFirst({
        where: { id: pk.id },
        select: { ...PK_SEL, rev_Nx03PkItem_pkId: { orderBy: { lineNo: 'asc' }, select: PK_ITEM_SEL } },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: 'CREATE',
        entityTable: 'nx03_pk',
        entityId: pk.id,
        entityCode: pk.docNo,
        summary: '建立撿貨單',
        afterData: full as object,
      });
      const { rev_Nx03PkItem_pkId, ...rest } = full!;
      return { ...rest, items: rev_Nx03PkItem_pkId };
    });
  }

  private async addItemTx(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    pk: Prisma.Nx03PkGetPayload<{ select: typeof PK_SEL }>,
    headerWarehouseId: string,
    lineNo: number,
    it: CreatePkItemDto,
  ) {
    const tenantId = pk.tenantId;
    this.assertItemRefConsistency(pk.triggerSource as 'S' | 'T', it);
    if (it.locationId) {
      const loc = await tx.nx01Location.findFirst({
        where: { id: it.locationId.trim(), tenantId, warehouseId: headerWarehouseId },
        select: { id: true },
      });
      if (!loc) throw new BadRequestException('locationId must belong to header warehouse');
    }
    // verify ref doc 存在且租戶一致
    if (it.refSoItemId) {
      const so = await tx.nx04SoItem.findFirst({
        where: { id: it.refSoItemId.trim(), so: { tenantId } },
        select: { id: true, soId: true },
      });
      if (!so) throw new BadRequestException('refSoItemId not found in tenant');
      if (it.refSoId && so.soId !== it.refSoId.trim()) {
        throw new BadRequestException('refSoId mismatch with refSoItemId.soId');
      }
    }
    if (it.refStId) {
      const st = await tx.nx03St.findFirst({
        where: { id: it.refStId.trim(), tenantId },
        select: { id: true },
      });
      if (!st) throw new BadRequestException('refStId not found in tenant');
    }
    const snap = await this.loadPartSnapshot(tx, tenantId, it.partId.trim());
    await tx.nx03PkItem.create({
      data: {
        pkId: pk.id,
        refSoId: it.refSoId?.trim() || null,
        refSoItemId: it.refSoItemId?.trim() || null,
        refStId: it.refStId?.trim() || null,
        lineNo,
        partId: it.partId.trim(),
        partNo: snap.partNo,
        partName: snap.partName,
        locationId: it.locationId?.trim() || null,
        qty: new PrismaNs.Decimal(it.qty),
        status: 'P',
        labelChecked: false,
        updatedBy: user.sub,
      },
    });
  }

  async update(user: RequestUser, id: string, dto: UpdatePkDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx03Pk.findFirst({ where: { id, tenantId }, select: PK_SEL });
    if (!existing) throw new NotFoundException('Pk not found');
    if (existing.status === PkStatus.VOIDED) throw new BadRequestException('Pk is voided');

    if (dto.status !== undefined && dto.status !== existing.status) {
      assertPkStatusTransition(existing.status, dto.status);
    }

    return this.prisma.$transaction(async (tx) => {
      const extra: Prisma.Nx03PkUpdateInput = {};
      // P → C：撿貨啟動、寫 startedAt
      if (dto.status === PkStatus.COUNTING && existing.status === PkStatus.PENDING) {
        extra.startedAt = new Date();
      }
      // C → F：撿貨完成、校驗所有 items status 非 P + 寫 completedAt/By
      if (dto.status === PkStatus.FINISHED && existing.status === PkStatus.COUNTING) {
        const pending = await tx.nx03PkItem.count({
          where: { pkId: id, status: 'P' },
        });
        if (pending > 0) {
          throw new BadRequestException(
            `Cannot finish Pk: ${pending} items still pending (status='P')`,
          );
        }
        extra.completedAt = new Date();
        extra.completedBy = user.sub;
      }
      await tx.nx03Pk.update({
        where: { id },
        data: {
          ...(dto.pkDate !== undefined ? { pkDate: new Date(dto.pkDate) } : {}),
          ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...extra,
          updatedBy: user.sub,
        },
      });
      const full = await tx.nx03Pk.findFirst({
        where: { id },
        select: { ...PK_SEL, rev_Nx03PkItem_pkId: { orderBy: { lineNo: 'asc' }, select: PK_ITEM_SEL } },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: dto.status === PkStatus.FINISHED ? 'FINISH' : 'UPDATE',
        entityTable: 'nx03_pk',
        entityId: id,
        entityCode: existing.docNo,
        summary: dto.status === PkStatus.FINISHED ? '撿貨完成' : '修改撿貨單',
        beforeData: existing as object,
        afterData: full as object,
      });
      const { rev_Nx03PkItem_pkId, ...rest } = full!;
      return { ...rest, items: rev_Nx03PkItem_pkId };
    });
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx03Pk.findFirst({ where: { id, tenantId }, select: PK_SEL });
    if (!existing) throw new NotFoundException('Pk not found');
    if (existing.status === PkStatus.VOIDED) throw new BadRequestException('Already voided');
    if (existing.status === PkStatus.FINISHED) {
      throw new BadRequestException('Cannot void finished Pk');
    }
    assertPkStatusTransition(existing.status, PkStatus.VOIDED);
    await this.prisma.nx03Pk.update({
      where: { id },
      data: { status: PkStatus.VOIDED, updatedBy: user.sub },
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: 'DELETE',
      entityTable: 'nx03_pk',
      entityId: id,
      entityCode: existing.docNo,
      summary: '作廢撿貨單',
      beforeData: existing as object,
    });
    return { ok: true };
  }

  async addItem(user: RequestUser, pkId: string, dto: CreatePkItemDto) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx03Pk.findFirst({ where: { id: pkId, tenantId }, select: PK_SEL });
    if (!head) throw new NotFoundException('Pk not found');
    this.assertItemsEditable(head.status);
    return this.prisma.$transaction(async (tx) => {
      const maxLine = await tx.nx03PkItem.aggregate({ where: { pkId }, _max: { lineNo: true } });
      const lineNo = (maxLine._max.lineNo ?? 0) + 1;
      await this.addItemTx(tx, user, head, head.warehouseId, lineNo, dto);
      const row = await tx.nx03PkItem.findFirst({
        where: { pkId, lineNo },
        select: PK_ITEM_SEL,
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: 'CREATE',
        entityTable: 'nx03_pk_item',
        entityId: row!.id,
        entityCode: head.docNo,
        summary: '新增撿貨明細',
        afterData: row as object,
      });
      return row;
    });
  }

  async patchItem(user: RequestUser, pkId: string, itemId: string, dto: PatchPkItemDto) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx03Pk.findFirst({ where: { id: pkId, tenantId }, select: PK_SEL });
    if (!head) throw new NotFoundException('Pk not found');
    this.assertItemsEditable(head.status);
    const existing = await this.prisma.nx03PkItem.findFirst({
      where: { id: itemId, pkId },
      select: PK_ITEM_SEL,
    });
    if (!existing) throw new NotFoundException('Pk item not found');

    // status=M 找不到貨時、notFoundReason 必填
    const nextStatus = dto.status ?? (existing.status as 'P' | 'C' | 'M');
    const nextReason = dto.notFoundReason !== undefined ? dto.notFoundReason : existing.notFoundReason;
    if (nextStatus === 'M' && !nextReason?.trim()) {
      throw new BadRequestException('notFoundReason is required when status=M (找不到貨)');
    }

    let locationId = existing.locationId;
    if (dto.locationId !== undefined) {
      const loc = await this.prisma.nx01Location.findFirst({
        where: { id: dto.locationId.trim(), tenantId, warehouseId: head.warehouseId },
        select: { id: true },
      });
      if (!loc) throw new BadRequestException('locationId must belong to header warehouse');
      locationId = dto.locationId.trim();
    }

    const row = await this.prisma.nx03PkItem.update({
      where: { id: itemId },
      data: {
        ...(dto.qty !== undefined ? { qty: new PrismaNs.Decimal(dto.qty) } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.notFoundReason !== undefined ? { notFoundReason: dto.notFoundReason } : {}),
        ...(dto.labelChecked !== undefined ? { labelChecked: dto.labelChecked } : {}),
        locationId,
        updatedBy: user.sub,
      },
      select: PK_ITEM_SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: 'UPDATE',
      entityTable: 'nx03_pk_item',
      entityId: itemId,
      entityCode: head.docNo,
      summary: '修改撿貨明細',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  async removeItem(user: RequestUser, pkId: string, itemId: string) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx03Pk.findFirst({ where: { id: pkId, tenantId }, select: PK_SEL });
    if (!head) throw new NotFoundException('Pk not found');
    this.assertItemsEditable(head.status);
    const existing = await this.prisma.nx03PkItem.findFirst({
      where: { id: itemId, pkId },
      select: PK_ITEM_SEL,
    });
    if (!existing) throw new NotFoundException('Pk item not found');
    await this.prisma.nx03PkItem.delete({ where: { id: itemId } });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: 'DELETE',
      entityTable: 'nx03_pk_item',
      entityId: itemId,
      entityCode: head.docNo,
      summary: '刪除撿貨明細',
      beforeData: existing as object,
    });
    return { ok: true };
  }
}

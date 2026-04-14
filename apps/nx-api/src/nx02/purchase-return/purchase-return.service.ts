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
import {
  assertPrStatusTransition,
  prApiToDb,
  prDbToApi,
  PrStatus,
} from '../../shared/nx02/nx02-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  CreatePurchaseReturnDto,
  CreatePurchaseReturnItemDto,
  PatchPurchaseReturnItemDto,
  UpdatePurchaseReturnDto,
} from './dto/purchase-return.dto';

const PR_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  prDate: true,
  warehouseId: true,
  supplierId: true,
  rrId: true,
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
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

const PR_ITEM_SEL = {
  id: true,
  prId: true,
  rrItemId: true,
  lineNo: true,
  partId: true,
  partNo: true,
  partName: true,
  locationId: true,
  qty: true,
  unitCost: true,
  lineAmount: true,
  returnReason: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

type PrHead = Prisma.Nx02PrGetPayload<{ select: typeof PR_SEL }>;

@Injectable()
export class PurchaseReturnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private mapPrHead(row: PrHead) {
    return { ...row, status: prDbToApi(row.status) };
  }

  private whereList(tenantId: string, q: Nx02ListQueryDto): Prisma.Nx02PrWhereInput {
    const where: Prisma.Nx02PrWhereInput = { tenantId, voidedAt: null };
    if (q.status?.trim()) {
      const s = q.status.trim();
      if (s === PrStatus.POSTED || s === PrStatus.CANCELLED || s === PrStatus.DRAFT) {
        where.status = prApiToDb(s);
      } else {
        where.status = s;
      }
    }
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [{ docNo: { contains: s, mode: 'insensitive' } }, { remark: { contains: s, mode: 'insensitive' } }];
    }
    return where;
  }

  private assertPrItemsEditable(statusDb: string) {
    if (statusDb !== 'D') throw new BadRequestException('Purchase return lines are only editable in DRAFT');
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

  private async recalcPrTotals(tx: Prisma.TransactionClient, prId: string, taxRate: PrismaNs.Decimal) {
    const items = await tx.nx02PrItem.findMany({ where: { prId }, select: { lineAmount: true } });
    let sub = new PrismaNs.Decimal(0);
    for (const it of items) sub = sub.add(it.lineAmount);
    const tax = sub.mul(taxRate).div(100).toDecimalPlaces(2);
    const total = sub.add(tax);
    await tx.nx02Pr.update({
      where: { id: prId },
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
      this.prisma.nx02Pr.count({ where }),
      this.prisma.nx02Pr.findMany({
        where,
        orderBy: [{ prDate: 'desc' }, { docNo: 'desc' }],
        skip,
        take: pageSize,
        select: PR_SEL,
      }),
    ]);
    return { page, pageSize, total, rows: rows.map((r) => this.mapPrHead(r)) };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx02Pr.findFirst({
      where: { id, tenantId },
      select: { ...PR_SEL, rev_Nx02PrItem_prId: { orderBy: { lineNo: 'asc' }, select: PR_ITEM_SEL } },
    });
    if (!row) throw new NotFoundException('Purchase return not found');
    const { rev_Nx02PrItem_prId, ...rest } = row;
    return {
      ...this.mapPrHead(rest),
      items: rev_Nx02PrItem_prId.map((it) => ({ ...it, unitPriceSnapshot: it.unitCost })),
    };
  }

  async create(user: RequestUser, dto: CreatePurchaseReturnDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const wh = await tx.nx01Warehouse.findFirst({ where: { id: dto.warehouseId, tenantId }, select: { code: true } });
      if (!wh) throw new NotFoundException('warehouseId not found');
      const sup = await tx.nx01Partner.findFirst({ where: { id: dto.supplierId, tenantId }, select: { id: true } });
      if (!sup) throw new NotFoundException('supplierId not found');
      if (dto.rrId) {
        const rr = await tx.nx02Rr.findFirst({ where: { id: dto.rrId, tenantId }, select: { id: true, status: true } });
        if (!rr) throw new NotFoundException('rrId not found');
        if (rr.status !== 'POSTED') throw new BadRequestException('Source RR must be POSTED');
      }
      const docNo = await allocDocNo(tx, tenantId, 'PR', wh.code);
      const taxRate = new PrismaNs.Decimal(dto.taxRate ?? 5);
      const currId = await resolveCurrencyId(tx, dto.currencyId ?? 'TWD');
      const pr = await tx.nx02Pr.create({
        data: {
          tenantId,
          docNo,
          prDate: new Date(dto.prDate),
          warehouseId: dto.warehouseId,
          supplierId: dto.supplierId,
          rrId: dto.rrId?.trim() || null,
          currencyId: currId,
          status: 'D',
          taxRate,
          subtotal: new PrismaNs.Decimal(0),
          taxAmount: new PrismaNs.Decimal(0),
          totalAmount: new PrismaNs.Decimal(0),
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: PR_SEL,
      });
      let line = 1;
      for (const it of dto.items) {
        await this.createPrItemTx(tx, tenantId, pr.id, dto.warehouseId, dto.rrId ?? null, line++, it, user.sub);
      }
      await this.recalcPrTotals(tx, pr.id, taxRate);
      const full = await tx.nx02Pr.findFirst({
        where: { id: pr.id },
        select: { ...PR_SEL, rev_Nx02PrItem_prId: { orderBy: { lineNo: 'asc' }, select: PR_ITEM_SEL } },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX02',
        action: 'CREATE',
        entityTable: 'nx02_pr',
        entityId: pr.id,
        entityCode: pr.docNo,
        summary: '建立退供應商',
        afterData: full as object,
      });
      const { rev_Nx02PrItem_prId, ...rest } = full!;
      return {
        ...this.mapPrHead(rest),
        items: rev_Nx02PrItem_prId.map((i) => ({ ...i, unitPriceSnapshot: i.unitCost })),
      };
    });
  }

  private async createPrItemTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    prId: string,
    warehouseId: string,
    rrId: string | null,
    lineNo: number,
    it: CreatePurchaseReturnItemDto,
    userId: string,
  ) {
    const rri = await tx.nx02RrItem.findFirst({
      where: { id: it.rrItemId.trim() },
      include: { rr: { select: { id: true, tenantId: true, warehouseId: true, status: true } } },
    });
    if (!rri || rri.rr.tenantId !== tenantId) throw new NotFoundException('rrItemId not found');
    if (rri.rr.status !== 'POSTED') throw new BadRequestException('Source RR must be POSTED');
    if (rri.rr.warehouseId !== warehouseId) throw new BadRequestException('RR item warehouse mismatch');
    if (rrId && rri.rr.id !== rrId) throw new BadRequestException('rrItemId not under header rrId');
    if (it.partId.trim() !== rri.partId) throw new BadRequestException('partId must match RR line');
    const snap = await this.loadPartSnapshot(tx, tenantId, it.partId.trim());
    const qty = new PrismaNs.Decimal(it.qty);
    const unit = new PrismaNs.Decimal(it.unitPriceSnapshot);
    await tx.nx02PrItem.create({
      data: {
        prId,
        lineNo,
        rrItemId: it.rrItemId.trim(),
        partId: it.partId.trim(),
        partNo: snap.partNo,
        partName: snap.partName,
        locationId: it.locationId?.trim() || null,
        qty,
        unitCost: unit,
        lineAmount: this.lineAmount(qty, unit),
        returnReason: it.returnReason?.trim() || 'O',
        remark: it.remark?.trim() || null,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async update(user: RequestUser, id: string, dto: UpdatePurchaseReturnDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx02Pr.findFirst({ where: { id, tenantId }, select: PR_SEL });
    if (!existing) throw new NotFoundException('Purchase return not found');
    if (existing.voidedAt) throw new BadRequestException('Purchase return is voided');
    let nextDb = existing.status;
    if (dto.status !== undefined) {
      const cur = prDbToApi(existing.status);
      assertPrStatusTransition(cur, dto.status);
      nextDb = prApiToDb(dto.status);
    }
    const taxRate =
      dto.taxRate !== undefined ? new PrismaNs.Decimal(dto.taxRate) : new PrismaNs.Decimal(existing.taxRate);
    const postedPatch =
      dto.status === PrStatus.POSTED && prDbToApi(existing.status) === PrStatus.DRAFT
        ? { postedAt: new Date(), postedBy: user.sub }
        : {};
    await this.prisma.nx02Pr.update({
      where: { id },
      data: {
        ...(dto.prDate !== undefined ? { prDate: new Date(dto.prDate) } : {}),
        ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
        ...(dto.status !== undefined ? { status: nextDb, ...postedPatch } : {}),
        ...(dto.taxRate !== undefined ? { taxRate } : {}),
        updatedBy: user.sub,
      },
    });
    if (dto.taxRate !== undefined) await this.recalcPrTotals(this.prisma, id, taxRate);
    const full = await this.prisma.nx02Pr.findFirst({
      where: { id },
      select: { ...PR_SEL, rev_Nx02PrItem_prId: { orderBy: { lineNo: 'asc' }, select: PR_ITEM_SEL } },
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX02',
      action: dto.status === PrStatus.POSTED ? 'POST' : 'UPDATE',
      entityTable: 'nx02_pr',
      entityId: id,
      entityCode: existing.docNo,
      summary: dto.status === PrStatus.POSTED ? '退供應商過帳' : '修改退供應商',
      beforeData: existing as object,
      afterData: full as object,
    });
    const { rev_Nx02PrItem_prId, ...rest } = full!;
    return {
      ...this.mapPrHead(rest),
      items: rev_Nx02PrItem_prId.map((i) => ({ ...i, unitPriceSnapshot: i.unitCost })),
    };
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx02Pr.findFirst({ where: { id, tenantId }, select: PR_SEL });
    if (!existing) throw new NotFoundException('Purchase return not found');
    if (existing.voidedAt) throw new BadRequestException('Already voided');
    if (existing.status === 'P') throw new BadRequestException('Cannot void posted purchase return');
    assertPrStatusTransition(prDbToApi(existing.status), PrStatus.CANCELLED);
    await this.prisma.nx02Pr.update({
      where: { id },
      data: { voidedAt: new Date(), voidedBy: user.sub, status: 'V', updatedBy: user.sub },
    });
    const full = await this.prisma.nx02Pr.findFirst({
      where: { id },
      select: { ...PR_SEL, rev_Nx02PrItem_prId: { orderBy: { lineNo: 'asc' }, select: PR_ITEM_SEL } },
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX02',
      action: 'DELETE',
      entityTable: 'nx02_pr',
      entityId: id,
      entityCode: existing.docNo,
      summary: '作廢退供應商',
      beforeData: existing as object,
      afterData: full as object,
    });
    const { rev_Nx02PrItem_prId, ...rest } = full!;
    return {
      ...this.mapPrHead(rest),
      items: rev_Nx02PrItem_prId.map((i) => ({ ...i, unitPriceSnapshot: i.unitCost })),
    };
  }

  async addItem(user: RequestUser, prId: string, dto: CreatePurchaseReturnItemDto) {
    const tenantId = requireTenantId(user);
    const pr = await this.prisma.nx02Pr.findFirst({ where: { id: prId, tenantId }, select: PR_SEL });
    if (!pr) throw new NotFoundException('Purchase return not found');
    if (pr.voidedAt) throw new BadRequestException('Purchase return is voided');
    this.assertPrItemsEditable(pr.status);
    const maxLine = await this.prisma.nx02PrItem.aggregate({ where: { prId }, _max: { lineNo: true } });
    const lineNo = (maxLine._max.lineNo ?? 0) + 1;
    const newId = await this.prisma.$transaction(async (tx) => {
      await this.createPrItemTx(tx, tenantId, prId, pr.warehouseId, pr.rrId, lineNo, dto, user.sub);
      await this.recalcPrTotals(tx, prId, new PrismaNs.Decimal(pr.taxRate));
      const last = await tx.nx02PrItem.findFirst({
        where: { prId },
        orderBy: { lineNo: 'desc' },
        select: { id: true },
      });
      return last!.id;
    });
    const row = await this.prisma.nx02PrItem.findFirst({
      where: { id: newId },
      select: PR_ITEM_SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX02',
      action: 'CREATE',
      entityTable: 'nx02_pr_item',
      entityId: row!.id,
      entityCode: pr.docNo,
      summary: '新增退供應商明細',
      afterData: row as object,
    });
    return { ...row!, unitPriceSnapshot: row!.unitCost };
  }

  async patchItem(user: RequestUser, prId: string, itemId: string, dto: PatchPurchaseReturnItemDto) {
    const tenantId = requireTenantId(user);
    const pr = await this.prisma.nx02Pr.findFirst({ where: { id: prId, tenantId }, select: PR_SEL });
    if (!pr) throw new NotFoundException('Purchase return not found');
    if (pr.voidedAt) throw new BadRequestException('Purchase return is voided');
    this.assertPrItemsEditable(pr.status);
    const existing = await this.prisma.nx02PrItem.findFirst({ where: { id: itemId, prId }, select: PR_ITEM_SEL });
    if (!existing) throw new NotFoundException('Item not found');
    const qty = dto.qty !== undefined ? new PrismaNs.Decimal(dto.qty) : new PrismaNs.Decimal(existing.qty);
    const unit =
      dto.unitPriceSnapshot !== undefined ? new PrismaNs.Decimal(dto.unitPriceSnapshot) : new PrismaNs.Decimal(existing.unitCost);
    const lineAmount = this.lineAmount(qty, unit);
    const row = await this.prisma.nx02PrItem.update({
      where: { id: itemId },
      data: {
        ...(dto.qty !== undefined ? { qty } : {}),
        ...(dto.unitPriceSnapshot !== undefined ? { unitCost: unit } : {}),
        lineAmount,
        ...(dto.locationId !== undefined ? { locationId: dto.locationId } : {}),
        ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
        updatedBy: user.sub,
      },
      select: PR_ITEM_SEL,
    });
    await this.recalcPrTotals(this.prisma, prId, new PrismaNs.Decimal(pr.taxRate));
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX02',
      action: 'UPDATE',
      entityTable: 'nx02_pr_item',
      entityId: itemId,
      entityCode: pr.docNo,
      summary: '修改退供應商明細',
      beforeData: existing as object,
      afterData: row as object,
    });
    return { ...row, unitPriceSnapshot: row.unitCost };
  }

  async removeItem(user: RequestUser, prId: string, itemId: string) {
    const tenantId = requireTenantId(user);
    const pr = await this.prisma.nx02Pr.findFirst({ where: { id: prId, tenantId }, select: PR_SEL });
    if (!pr) throw new NotFoundException('Purchase return not found');
    if (pr.voidedAt) throw new BadRequestException('Purchase return is voided');
    this.assertPrItemsEditable(pr.status);
    const existing = await this.prisma.nx02PrItem.findFirst({ where: { id: itemId, prId }, select: PR_ITEM_SEL });
    if (!existing) throw new NotFoundException('Item not found');
    await this.prisma.nx02PrItem.delete({ where: { id: itemId } });
    await this.recalcPrTotals(this.prisma, prId, new PrismaNs.Decimal(pr.taxRate));
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX02',
      action: 'DELETE',
      entityTable: 'nx02_pr_item',
      entityId: itemId,
      entityCode: pr.docNo,
      summary: '刪除退供應商明細',
      beforeData: existing as object,
    });
    return { ok: true };
  }
}

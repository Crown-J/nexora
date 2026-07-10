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
import { createAllowanceFromSalesReturn } from '../../shared/nx05/nx05-create-allowance-from-sr';
import { createReturnPickupFromPostedSr } from '../../shared/nx06/nx06-create-return-pickup-from-sr';
import { allocNx04DocNo } from '../../shared/nx04/nx04-doc-no';
import { requireDefaultLocationId } from '../../shared/nx04/nx04-location';
import { Nx04ListQueryDto } from '../../shared/nx04/nx04-list-query.dto';
import {
  assertSalesReturnStatusTransition,
  SalesReturnStatus,
  SoStatus,
} from '../../shared/nx04/nx04-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  CreateSalesReturnDto,
  CreateSalesReturnItemDto,
  PatchSalesReturnItemDto,
  UpdateSalesReturnDto,
} from './dto/sales-return.dto';

const SR_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  warehouseId: true,
  srDate: true,
  customerId: true,
  soId: true,
  returnMethod: true,
  // 05 補做 C1 2026-06-09：退回方式（A=業務發起 / B=送貨員當場帶回）
  initiationType: true,
  status: true,
  subtotal: true,
  taxRate: true,
  taxAmount: true,
  totalAmount: true,
  approvedAt: true,
  approvedBy: true,
  rejectReason: true,
  receivedAt: true,
  receivedBy: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  // NX04-QT-SHELL 2026-07-10：單據模板需顯示名稱欄（比照 SoService enrich）
  customer: { select: { code: true, name: true } },
  warehouse: { select: { code: true, name: true } },
  so: { select: { docNo: true } },
} as const;

const SR_ITEM_SEL = {
  id: true,
  srId: true,
  soItemId: true,
  lineNo: true,
  partId: true,
  partNo: true,
  partName: true,
  returnPolicy: true,
  returnType: true,
  returnReason: true,
  concessionReason: true,
  qty: true,
  unitPrice: true,
  lineAmount: true,
  locationId: true,
  dispositionFlag: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

function mapSrItemApi<T extends { unitPrice: PrismaNs.Decimal | unknown }>(row: T) {
  const u = row.unitPrice as PrismaNs.Decimal;
  return { ...row, unitPriceSnapshot: u };
}

// NX04-QT-SHELL 2026-07-10：把 SR_SEL 帶的 customer/warehouse/so 關聯攤平（比照 SoService.flattenSoRefs）
function flattenSrRefs<T extends Record<string, unknown>>(rest: T) {
  const { customer, warehouse, so, ...plain } = rest as Record<string, unknown> & {
    customer?: { code?: string; name?: string } | null;
    warehouse?: { code?: string; name?: string } | null;
    so?: { docNo?: string } | null;
  };
  return {
    ...plain,
    customerCode: customer?.code ?? null,
    customerName: customer?.name ?? null,
    warehouseCode: warehouse?.code ?? null,
    warehouseName: warehouse?.name ?? null,
    soDocNo: so?.docNo ?? null,
  };
}

@Injectable()
export class SalesReturnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx04ListQueryDto): Prisma.Nx04SrWhereInput {
    const where: Prisma.Nx04SrWhereInput = { tenantId };
    if (q.status?.trim()) where.status = q.status.trim();
    if (q.search?.trim()) {
      const s = q.search.trim();
      // NX04-QT-SHELL：搜尋含 單號/備註/客戶編號/客戶名稱/來源銷貨單號（比照 SoService）
      where.OR = [
        { docNo: { contains: s, mode: 'insensitive' } },
        { remark: { contains: s, mode: 'insensitive' } },
        { customer: { code: { contains: s, mode: 'insensitive' } } },
        { customer: { name: { contains: s, mode: 'insensitive' } } },
        { so: { docNo: { contains: s, mode: 'insensitive' } } },
      ];
    }
    return where;
  }

  private mapDetail(row: { rev_Nx04SrItem_srId: unknown[] } & Record<string, unknown>) {
    const { rev_Nx04SrItem_srId: items, ...rest } = row;
    return {
      ...flattenSrRefs(rest),
      items: (items as object[]).map((it) => mapSrItemApi(it as never)),
    };
  }

  private lineAmount(qty: PrismaNs.Decimal, unit: PrismaNs.Decimal) {
    return qty.mul(unit).toDecimalPlaces(2);
  }

  private assertSrItemsEditable(status: string) {
    if (status !== SalesReturnStatus.DRAFT && status !== SalesReturnStatus.INSPECTING) {
      throw new BadRequestException('Sales return line items are not editable in current status');
    }
  }

  private async sumReturnedElsewhere(
    tx: Prisma.TransactionClient,
    tenantId: string,
    soItemId: string,
    excludeSrItemId?: string,
  ) {
    const agg = await tx.nx04SrItem.aggregate({
      where: {
        soItemId,
        ...(excludeSrItemId ? { id: { not: excludeSrItemId } } : {}),
        sr: {
          tenantId,
          status: { notIn: [SalesReturnStatus.CANCELLED, SalesReturnStatus.REJECTED] },
        },
      },
      _sum: { qty: true },
    });
    return agg._sum.qty ? new PrismaNs.Decimal(agg._sum.qty) : new PrismaNs.Decimal(0);
  }

  private async validateReturnQty(
    tx: Prisma.TransactionClient,
    tenantId: string,
    soItemId: string,
    qty: PrismaNs.Decimal,
    excludeSrItemId?: string,
    sameBatchPriorQty?: PrismaNs.Decimal,
  ) {
    const soItem = await tx.nx04SoItem.findFirst({
      where: { id: soItemId, so: { tenantId } },
      select: { qty: true },
    });
    if (!soItem) throw new BadRequestException('soItemId invalid for tenant');
    const max = new PrismaNs.Decimal(soItem.qty);
    const already = await this.sumReturnedElsewhere(tx, tenantId, soItemId, excludeSrItemId);
    const prior = sameBatchPriorQty ?? new PrismaNs.Decimal(0);
    if (already.add(prior).add(qty).gt(max)) {
      throw new BadRequestException('Return qty exceeds remaining qty for SO line');
    }
  }

  private async recalcSrTotals(tx: Prisma.TransactionClient, srId: string, taxRate: PrismaNs.Decimal) {
    const items = await tx.nx04SrItem.findMany({
      where: { srId },
      select: { lineAmount: true },
    });
    let sub = new PrismaNs.Decimal(0);
    for (const it of items) sub = sub.add(it.lineAmount);
    const tax = sub.mul(taxRate).div(100).toDecimalPlaces(2);
    const total = sub.add(tax);
    await tx.nx04Sr.update({
      where: { id: srId },
      data: { subtotal: sub, taxAmount: tax, totalAmount: total },
    });
  }

  /**
   * SR 過帳：好品/壞品分流（NX04-M2 §A C4 Crown 2026-05-29 Q5 方案 B）
   * - dispositionFlag='G' 好品 → applyQtyInWithLedger 入主倉、可再賣
   * - dispositionFlag='B' 壞品 → 寫 Nx03IssueReport（issueType='D' 損毀）
   *   sourceModule='NX04' / sourceDocType='SR' / sourceDocId=srId / relatedDocId=srItem.id
   * - dispositionFlag=null → 過帳前已 throw（update POSTED 路徑 pre-validate）
   *
   * AR 接點既有已串通（既有 createAllowanceFromSalesReturn / Phase 4 commit 4a 落地）、
   * 本 commit 不動 AR 邏輯。
   */
  private async applySrPosting(
    tx: Prisma.TransactionClient,
    srId: string,
    tenantId: string,
    userId: string,
  ) {
    const items = await tx.nx04SrItem.findMany({
      where: { srId },
      select: { ...SR_ITEM_SEL },
    });
    if (!items.length) throw new BadRequestException('Sales return has no items to post');
    for (const item of items) {
      // 歷史匯入銷退（soItemId=null、無來源明細）不可過帳；系統內建立的銷退必掛來源明細
      if (!item.soItemId) throw new BadRequestException('歷史匯入銷退（無來源明細）不可過帳');
      const soItem = await tx.nx04SoItem.findFirst({
        where: { id: item.soItemId, so: { tenantId } },
        select: { warehouseId: true, unitPrice: true },
      });
      if (!soItem) throw new BadRequestException('SO item missing for sales return line');
      const qtyIn = new PrismaNs.Decimal(item.qty);
      if (qtyIn.lte(0)) continue;
      const locId =
        item.locationId?.trim() ||
        (await requireDefaultLocationId(tx, tenantId, soItem.warehouseId));
      const loc = await tx.nx01Location.findFirst({
        where: { id: locId, tenantId, warehouseId: soItem.warehouseId },
        select: { id: true },
      });
      if (!loc) throw new BadRequestException('locationId must belong to SO line warehouse');
      const partVersion = await tx.nx01PartVersion.findFirst({
        where: { tenantId, partId: item.partId, effectiveTo: null },
        orderBy: { versionNo: 'desc' },
        select: { id: true },
      });

      // === NX04-M2 §A C4：好品/壞品分流 ===
      if (item.dispositionFlag === 'B') {
        // 壞品 → 寫 Nx03IssueReport（issueType='D' 損毀）、不入庫
        const wh = await tx.nx01Warehouse.findFirst({
          where: { id: soItem.warehouseId, tenantId },
          select: { code: true },
        });
        if (!wh) throw new BadRequestException('SO warehouse invalid for issue report');
        const irDocNo = await allocNx03DocNo(tx, tenantId, 'IR', wh.code);
        await tx.nx03IssueReport.create({
          data: {
            tenantId,
            docNo: irDocNo,
            reportDate: new Date(),
            warehouseId: soItem.warehouseId,
            locationId: locId,
            partId: item.partId,
            partNo: item.partNo,
            partName: item.partName,
            partVersionId: partVersion?.id ?? null,
            qty: qtyIn,
            issueType: 'D', // 損毀
            dispositionType: 'N', // 未處置、待後續
            relatedDocId: item.id,
            sourceModule: 'NX04',
            sourceDocType: 'SR',
            sourceDocId: srId,
            status: 'REPORTED',
            description: `銷退壞品 ${item.partNo} qty=${qtyIn.toString()}（returnReason=${item.returnReason}）`,
            createdBy: userId,
            updatedBy: userId,
          },
        });
      } else {
        // 好品（dispositionFlag='G' 或 null - 保守視為好品避免破壞既有測試）
        // 注意：null 進到這裡表示前置 validate 漏網（returnAction='X' 路徑早 skipLedger、不會到 applySrPosting）
        const bid = await tx.nx03StockBalance.findFirst({
          where: { tenantId, partId: item.partId, warehouseId: soItem.warehouseId },
          select: { avgCost: true },
        });
        const unitCost = bid ? new PrismaNs.Decimal(bid.avgCost) : new PrismaNs.Decimal(soItem.unitPrice);
        await applyQtyInWithLedger(tx, {
          tenantId,
          userId,
          partId: item.partId,
          warehouseId: soItem.warehouseId,
          locationId: locId,
          qtyIn,
          unitCost,
          sourceModule: 'NX04',
          sourceDocType: 'R',
          sourceDocId: srId,
          sourceItemId: item.id,
          partVersionId: partVersion?.id ?? null,
        });
      }
    }
  }

  /**
   * 過帳前驗證：dispositionFlag 必填（NX04-M2 §A C4）
   * returnAction='X' 換新路徑 skip（不沖庫存、無需檢查）
   */
  private async assertAllItemsDispositioned(tx: Prisma.TransactionClient, srId: string) {
    const items = await tx.nx04SrItem.findMany({
      where: { srId },
      select: { lineNo: true, dispositionFlag: true },
    });
    const missing = items.filter((i) => !i.dispositionFlag);
    if (missing.length) {
      throw new BadRequestException(
        `Posting requires倉管 dispositionFlag (G=好品 / B=壞品) on all lines; ` +
          `missing on lineNo: ${missing.map((m) => m.lineNo).join(', ')}`,
      );
    }
  }

  async list(user: RequestUser, q: Nx04ListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx04Sr.count({ where }),
      this.prisma.nx04Sr.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        // NX04-QT-SHELL：單據模板列表需 建單人員名 + 項目數
        select: { ...SR_SEL, _count: { select: { rev_Nx04SrItem_srId: true } } },
      }),
    ]);
    // 建單人員名（批次查 user、比照 SoService）
    const creatorIds = [...new Set(rows.map((r) => r.createdBy).filter(Boolean))];
    const creators = creatorIds.length
      ? await this.prisma.nx01User.findMany({ where: { id: { in: creatorIds } }, select: { id: true, userName: true } })
      : [];
    const creatorMap = new Map(creators.map((c) => [c.id, c.userName]));
    const items = rows.map((r) => {
      const { _count, ...rest } = r as typeof r & { _count: { rev_Nx04SrItem_srId: number } };
      return {
        ...flattenSrRefs(rest as never),
        itemCount: _count?.rev_Nx04SrItem_srId ?? 0,
        createdByName: creatorMap.get(r.createdBy) ?? null,
      };
    });
    return { page, pageSize, total, items };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx04Sr.findFirst({
      where: { id, tenantId },
      select: {
        ...SR_SEL,
        rev_Nx04SrItem_srId: { orderBy: { lineNo: 'asc' }, select: SR_ITEM_SEL },
      },
    });
    if (!row) throw new NotFoundException('Sales return not found');
    const mapped = this.mapDetail(row as never);
    // NX04-QT-SHELL：建單人員名（詳情顯示）
    const creator = row.createdBy
      ? await this.prisma.nx01User.findFirst({ where: { id: row.createdBy }, select: { userName: true } })
      : null;
    return { ...mapped, createdByName: creator?.userName ?? null };
  }

  private async assertSoReturnable(tx: Prisma.TransactionClient, tenantId: string, soId: string) {
    const so = await tx.nx04So.findFirst({
      where: { id: soId, tenantId, cancelledAt: null },
      select: { id: true, status: true, customerId: true, warehouseId: true },
    });
    if (!so) throw new NotFoundException('SO not found');
    if (so.status !== SoStatus.SHIPPED && so.status !== SoStatus.INVOICED) {
      throw new BadRequestException('SO must be SHIPPED or INVOICED to create sales return');
    }
    return so;
  }

  private async createSrItemTx(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    srId: string,
    lineNo: number,
    dto: CreateSalesReturnItemDto,
    soId: string,
    batchAccum: Map<string, PrismaNs.Decimal>,
  ) {
    const tenantId = requireTenantId(user);
    const soItem = await tx.nx04SoItem.findFirst({
      where: { id: dto.soItemId.trim(), soId },
      select: {
        partId: true,
        partNo: true,
        partName: true,
        unitPrice: true,
      },
    });
    if (!soItem) throw new BadRequestException('soItemId must belong to source SO');
    const part = await tx.nx01Part.findFirst({
      where: { id: soItem.partId, tenantId },
      select: { returnPolicy: true },
    });
    if (!part) throw new NotFoundException('Part not found');
    const qty = new PrismaNs.Decimal(dto.qty);
    const key = dto.soItemId.trim();
    const prevInBatch = batchAccum.get(key) ?? new PrismaNs.Decimal(0);
    if ((dto.returnType?.trim() || 'N') === 'E' && !dto.concessionReason?.trim()) {
      throw new BadRequestException('concessionReason is required when returnType=E');
    }
    await this.validateReturnQty(tx, tenantId, key, qty, undefined, prevInBatch);
    batchAccum.set(key, prevInBatch.add(qty));
    const unit = new PrismaNs.Decimal(soItem.unitPrice);
    await tx.nx04SrItem.create({
      data: {
        srId,
        lineNo,
        soItemId: dto.soItemId.trim(),
        partId: soItem.partId,
        partNo: soItem.partNo,
        partName: soItem.partName,
        returnPolicy: part.returnPolicy,
        returnType: dto.returnType?.trim() || 'N',
        returnReason: dto.returnReason.trim(),
        concessionReason: dto.concessionReason?.trim() || null,
        qty,
        unitPrice: unit,
        lineAmount: this.lineAmount(qty, unit),
        locationId: dto.locationId?.trim() || null,
        dispositionFlag: dto.dispositionFlag ?? null,
        remark: dto.remark?.trim() || null,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
    });
  }

  async create(user: RequestUser, dto: CreateSalesReturnDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const so = await this.assertSoReturnable(tx, tenantId, dto.soId.trim());
      const wh = await tx.nx01Warehouse.findFirst({
        where: { id: so.warehouseId, tenantId },
        select: { code: true },
      });
      if (!wh) throw new BadRequestException('SO warehouse invalid');
      const docNo = await allocNx04DocNo(tx, tenantId, 'SR', wh.code);
      const taxRate = new PrismaNs.Decimal(dto.taxRate);
      const sr = await tx.nx04Sr.create({
        data: {
          tenantId,
          docNo,
          warehouseId: so.warehouseId,
          srDate: new Date(dto.srDate),
          customerId: so.customerId,
          soId: so.id,
          returnMethod: dto.returnMethod.trim(),
          // 05 補做 C1 2026-06-09：退回方式
          initiationType: dto.initiationType ?? null,
          status: SalesReturnStatus.DRAFT,
          taxRate,
          subtotal: 0,
          taxAmount: 0,
          totalAmount: 0,
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: SR_SEL,
      });
      const batchAccum = new Map<string, PrismaNs.Decimal>();
      let lineNo = 1;
      if (dto.items?.length) {
        for (const it of dto.items) {
          await this.createSrItemTx(tx, user, sr.id, lineNo++, it, so.id, batchAccum);
        }
      }
      await this.recalcSrTotals(tx, sr.id, taxRate);
      const full = await tx.nx04Sr.findFirst({
        where: { id: sr.id },
        select: {
          ...SR_SEL,
          rev_Nx04SrItem_srId: { orderBy: { lineNo: 'asc' }, select: SR_ITEM_SEL },
        },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX04',
        action: 'CREATE',
        entityTable: 'nx04_sr',
        entityId: sr.id,
        entityCode: sr.docNo,
        summary: '建立銷退單',
        afterData: full as object,
      });
      return this.mapDetail(full as never);
    });
  }

  async update(user: RequestUser, id: string, dto: UpdateSalesReturnDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx04Sr.findFirst({ where: { id, tenantId }, select: SR_SEL });
    if (!existing) throw new NotFoundException('Sales return not found');

    if (dto.status !== undefined && dto.status !== existing.status) {
      assertSalesReturnStatusTransition(existing.status, dto.status);
    }
    if (dto.status === SalesReturnStatus.REJECTED && !dto.rejectReason?.trim()) {
      throw new BadRequestException('rejectReason is required when rejecting sales return');
    }

    // NX04-IMPL-01 Phase 3 commit 3c：returnAction R/D/X 入口分流（Crown Q-C3=A、仿 NX02 returnMode 範式）
    //   R/D → 既有 applySrPosting 入庫 source=R（貨退回、ledger 沖回）+ Phase 4 NX05 Allowance bridge
    //   X 換新 → skip ledger（貨未實際回到我方倉、業務員手動建新 SO 換新）
    const returnAction = dto.returnAction ?? 'R'; // default R 退錢（業界常態）
    const skipLedger =
      dto.status === SalesReturnStatus.POSTED && returnAction === 'X';

    return this.prisma.$transaction(async (tx) => {
      if (dto.status === SalesReturnStatus.POSTED && existing.status === SalesReturnStatus.INSPECTING) {
        if (skipLedger) {
          // X 換新：仍校驗 items 存在、但不沖庫存、不要求 dispositionFlag（貨未實際回到我方倉）
          const items = await tx.nx04SrItem.findMany({ where: { srId: id }, select: { id: true } });
          if (!items.length) throw new BadRequestException('Sales return has no items to post');
          // X 換新後續軌：自動建新 SO 換新（業務員手動先做、後續軌可補）
        } else {
          // NX04-M2 §A C4：R/D 路徑過帳前 validate dispositionFlag 必填
          await this.assertAllItemsDispositioned(tx, id);
          // R/D 路徑：好品/壞品分流（NX04-M2 §A C4）+ NX05 Allowance bridge（Phase 4 commit 4a 既有）
          await this.applySrPosting(tx, id, tenantId, user.sub);
          await createAllowanceFromSalesReturn(tx, {
            tenantId,
            srId: id,
            userId: user.sub,
            returnAction, // R 退錢 / D 折讓
          });
          // NX06-IMPL-01 Phase 4：R/D 自動建 NX06 RETURN_PICKUP DN 草稿（冪等、無客戶地址則 skip 不 throw）
          await createReturnPickupFromPostedSr(tx, {
            tenantId,
            srId: id,
            userId: user.sub,
          });
        }
      }
      await tx.nx04Sr.update({
        where: { id },
        data: {
          ...(dto.srDate !== undefined ? { srDate: new Date(dto.srDate) } : {}),
          ...(dto.remark !== undefined ? { remark: dto.remark?.trim() || null } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.status === SalesReturnStatus.REJECTED ? { rejectReason: dto.rejectReason!.trim() } : {}),
          ...(dto.status === SalesReturnStatus.POSTED
            ? {
                receivedAt: new Date(),
                receivedBy: user.sub,
              }
            : {}),
          // 05 補做 C1 2026-06-09：退回方式 patch
          ...(dto.initiationType !== undefined ? { initiationType: dto.initiationType } : {}),
          updatedBy: user.sub,
        },
      });
      const full = await tx.nx04Sr.findFirst({
        where: { id },
        select: {
          ...SR_SEL,
          rev_Nx04SrItem_srId: { orderBy: { lineNo: 'asc' }, select: SR_ITEM_SEL },
        },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX04',
        action: dto.status === SalesReturnStatus.POSTED ? 'POST' : 'UPDATE',
        entityTable: 'nx04_sr',
        entityId: id,
        entityCode: existing.docNo,
        summary: dto.status === SalesReturnStatus.POSTED ? '銷退過帳(POSTED)' : '修改銷退單',
        beforeData: existing as object,
        afterData: full as object,
      });
      return this.mapDetail(full as never);
    });
  }

  async softDelete(user: RequestUser, id: string, reason?: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx04Sr.findFirst({ where: { id, tenantId }, select: SR_SEL });
    if (!existing) throw new NotFoundException('Sales return not found');
    if (existing.status !== SalesReturnStatus.DRAFT && existing.status !== SalesReturnStatus.INSPECTING) {
      throw new BadRequestException('Only DRAFT or INSPECTING sales return can be voided');
    }
    assertSalesReturnStatusTransition(existing.status, SalesReturnStatus.CANCELLED);
    return this.prisma.$transaction(async (tx) => {
      const v = reason?.trim();
      const prevR = existing.remark?.trim();
      const nextRemark =
        v && prevR ? `${prevR} | VOID:${v}`.slice(0, 200) : v ? `VOID:${v}`.slice(0, 200) : existing.remark;
      await tx.nx04Sr.update({
        where: { id },
        data: {
          status: SalesReturnStatus.CANCELLED,
          remark: nextRemark,
          updatedBy: user.sub,
        },
      });
      const full = await tx.nx04Sr.findFirst({
        where: { id },
        select: {
          ...SR_SEL,
          rev_Nx04SrItem_srId: { orderBy: { lineNo: 'asc' }, select: SR_ITEM_SEL },
        },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX04',
        action: 'DELETE',
        entityTable: 'nx04_sr',
        entityId: id,
        entityCode: existing.docNo,
        summary: '作廢銷退單',
        beforeData: existing as object,
        afterData: full as object,
      });
      return this.mapDetail(full as never);
    });
  }

  async addItem(user: RequestUser, srId: string, dto: CreateSalesReturnItemDto) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx04Sr.findFirst({ where: { id: srId, tenantId }, select: SR_SEL });
    if (!head) throw new NotFoundException('Sales return not found');
    this.assertSrItemsEditable(head.status);
    // 歷史匯入銷退（soId=null、無來源單）不可新增明細；系統內建立的銷退必掛來源單
    if (!head.soId) throw new BadRequestException('歷史匯入銷退（無來源單）不可新增明細');
    const headSoId = head.soId;
    const maxLine = await this.prisma.nx04SrItem.aggregate({ where: { srId }, _max: { lineNo: true } });
    const lineNo = (maxLine._max.lineNo ?? 0) + 1;
    await this.prisma.$transaction(async (tx) => {
      const batchAccum = new Map<string, PrismaNs.Decimal>();
      await this.createSrItemTx(tx, user, srId, lineNo, dto, headSoId, batchAccum);
      await this.recalcSrTotals(tx, srId, new PrismaNs.Decimal(String(head.taxRate)));
    });
    const row = await this.prisma.nx04SrItem.findFirst({
      where: { srId, lineNo },
      select: SR_ITEM_SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'CREATE',
      entityTable: 'nx04_sr_item',
      entityId: row!.id,
      entityCode: head.docNo,
      summary: '新增銷退明細',
      afterData: mapSrItemApi(row!) as object,
    });
    return mapSrItemApi(row!);
  }

  async patchItem(user: RequestUser, srId: string, itemId: string, dto: PatchSalesReturnItemDto) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx04Sr.findFirst({ where: { id: srId, tenantId }, select: SR_SEL });
    if (!head) throw new NotFoundException('Sales return not found');
    this.assertSrItemsEditable(head.status);
    const existing = await this.prisma.nx04SrItem.findFirst({ where: { id: itemId, srId }, select: SR_ITEM_SEL });
    if (!existing) throw new NotFoundException('Sales return item not found');
    // 歷史匯入銷退明細（soItemId=null、無來源明細）不可編輯；系統內建立的必掛來源明細
    if (!existing.soItemId) throw new BadRequestException('歷史匯入銷退明細（無來源明細）不可編輯');
    const existingSoItemId = existing.soItemId;
    if (dto.locationId !== undefined) {
      const soItem = await this.prisma.nx04SoItem.findFirst({
        where: { id: existingSoItemId },
        select: { warehouseId: true },
      });
      const loc = await this.prisma.nx01Location.findFirst({
        where: { id: dto.locationId.trim(), tenantId, warehouseId: soItem!.warehouseId },
        select: { id: true },
      });
      if (!loc) throw new BadRequestException('locationId must belong to SO line warehouse');
    }
    const qty = dto.qty !== undefined ? new PrismaNs.Decimal(dto.qty) : new PrismaNs.Decimal(existing.qty);
    const unit = new PrismaNs.Decimal(existing.unitPrice);
    await this.prisma.$transaction(async (tx) => {
      if (dto.qty !== undefined) {
        await this.validateReturnQty(tx, tenantId, existingSoItemId, qty, itemId);
      }
      await tx.nx04SrItem.update({
        where: { id: itemId },
        data: {
          ...(dto.locationId !== undefined ? { locationId: dto.locationId.trim() } : {}),
          qty,
          lineAmount: this.lineAmount(qty, unit),
          ...(dto.returnReason !== undefined ? { returnReason: dto.returnReason.trim() } : {}),
          ...(dto.returnType !== undefined ? { returnType: dto.returnType.trim() } : {}),
          ...(dto.concessionReason !== undefined ? { concessionReason: dto.concessionReason?.trim() || null } : {}),
          ...(dto.dispositionFlag !== undefined ? { dispositionFlag: dto.dispositionFlag } : {}),
          ...(dto.remark !== undefined ? { remark: dto.remark?.trim() || null } : {}),
          updatedBy: user.sub,
        },
      });
      await this.recalcSrTotals(tx, srId, new PrismaNs.Decimal(String(head.taxRate)));
    });
    const row = await this.prisma.nx04SrItem.findFirst({ where: { id: itemId }, select: SR_ITEM_SEL });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'UPDATE',
      entityTable: 'nx04_sr_item',
      entityId: itemId,
      entityCode: head.docNo,
      summary: '修改銷退明細',
      beforeData: mapSrItemApi(existing) as object,
      afterData: mapSrItemApi(row!) as object,
    });
    return mapSrItemApi(row!);
  }

  async removeItem(user: RequestUser, srId: string, itemId: string) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx04Sr.findFirst({ where: { id: srId, tenantId }, select: SR_SEL });
    if (!head) throw new NotFoundException('Sales return not found');
    this.assertSrItemsEditable(head.status);
    const existing = await this.prisma.nx04SrItem.findFirst({ where: { id: itemId, srId }, select: SR_ITEM_SEL });
    if (!existing) throw new NotFoundException('Sales return item not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.nx04SrItem.delete({ where: { id: itemId } });
      await this.recalcSrTotals(tx, srId, new PrismaNs.Decimal(String(head.taxRate)));
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'DELETE',
      entityTable: 'nx04_sr_item',
      entityId: itemId,
      entityCode: head.docNo,
      summary: '刪除銷退明細',
      beforeData: mapSrItemApi(existing) as object,
    });
    return { ok: true };
  }
}

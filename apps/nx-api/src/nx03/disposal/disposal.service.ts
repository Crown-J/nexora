// apps/nx-api/src/nx03/disposal/disposal.service.ts
// NX03 Disposal service（報廢單、Crown Q-B1=a 不簽核、倉管直接過帳 D→P）
// 對齊 overview §3.3 #8 報廢出庫 source=W
// schema M3 落地（commit 5 / 7414f26）、本 commit 補 service + endpoint + helper 接帳

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
import {
  closeIssueReportFromDisposition,
  isOffBookIssueReport,
} from '../../shared/nx03/nx03-issue-report-close';
import { Nx03ListQueryDto } from '../../shared/nx03/nx03-list-query.dto';
import {
  assertDisposalStatusTransition,
  DisposalStatus,
} from '../../shared/nx03/nx03-state-machine';
import { postDisposalToGl } from '../../shared/nx05/nx05-post-stock-doc-to-gl';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  CreateDisposalDto,
  CreateDisposalItemDto,
  PatchDisposalItemDto,
  UpdateDisposalDto,
} from './dto/disposal.dto';

const DS_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  warehouseId: true,
  disposalDate: true,
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
  // W5 異常鏈 Step 3 2026-07-11：來源異常回報單（過帳回寫結案 + 帳已調來源免扣帳判斷用）
  sourceIssueReportId: true,
} as const;

const DS_ITEM_SEL = {
  id: true,
  disposalId: true,
  lineNo: true,
  partId: true,
  partNo: true,
  partName: true,
  partVersionId: true,
  locationId: true,
  qty: true,
  unitCost: true,
  totalCost: true,
  disposalReason: true,
  disposalRemark: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

@Injectable()
export class DisposalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx03ListQueryDto): Prisma.Nx03DisposalWhereInput {
    const where: Prisma.Nx03DisposalWhereInput = { tenantId, voidedAt: null };
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
    if (status !== DisposalStatus.DRAFT) {
      throw new BadRequestException('Disposal line items are only editable in DRAFT status');
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

  /** M1 配套：取 part 當下最新 active version（effectiveTo IS NULL、versionNo desc）。 */
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

  /** 從 stock_balance.avgCost 取出庫單價（出庫成本標準）。 */
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

  private mapDetail(row: { items: unknown[] } & Record<string, unknown>) {
    return row;
  }

  async list(user: RequestUser, q: Nx03ListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx03Disposal.count({ where }),
      this.prisma.nx03Disposal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: DS_SEL,
      }),
    ]);
    return { page, pageSize, total, items: rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx03Disposal.findFirst({
      where: { id, tenantId },
      select: {
        ...DS_SEL,
        items: { orderBy: { lineNo: 'asc' }, select: DS_ITEM_SEL },
      },
    });
    if (!row) throw new NotFoundException('Disposal not found');
    return row;
  }

  async create(user: RequestUser, dto: CreateDisposalDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const wh = await tx.nx01Warehouse.findFirst({
        where: { id: dto.warehouseId.trim(), tenantId },
        select: { id: true, code: true },
      });
      if (!wh) throw new BadRequestException('warehouseId invalid');
      const docNo = await allocNx03DocNo(tx, tenantId, 'DS', wh.code);
      const ds = await tx.nx03Disposal.create({
        data: {
          tenantId,
          docNo,
          warehouseId: wh.id,
          disposalDate: new Date(dto.disposalDate),
          status: DisposalStatus.DRAFT,
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: DS_SEL,
      });
      let line = 1;
      if (dto.items?.length) {
        for (const it of dto.items) {
          await this.addItemTx(tx, user, ds, wh.id, line++, it);
        }
      }
      const full = await tx.nx03Disposal.findFirst({
        where: { id: ds.id },
        select: { ...DS_SEL, items: { orderBy: { lineNo: 'asc' }, select: DS_ITEM_SEL } },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: 'CREATE',
        entityTable: 'nx03_disposal',
        entityId: ds.id,
        entityCode: ds.docNo,
        summary: '建立報廢單',
        afterData: full as object,
      });
      return full;
    });
  }

  private async addItemTx(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    ds: Prisma.Nx03DisposalGetPayload<{ select: typeof DS_SEL }>,
    headerWarehouseId: string,
    lineNo: number,
    it: CreateDisposalItemDto,
  ) {
    const tenantId = ds.tenantId;
    const loc = await tx.nx01Location.findFirst({
      where: { id: it.locationId.trim(), tenantId, warehouseId: headerWarehouseId },
      select: { id: true },
    });
    if (!loc) throw new BadRequestException('locationId must belong to header warehouse');
    // disposalReason='D'（其他）時 disposalRemark 必填（schema 註解、application 自律）
    if (it.disposalReason === 'D' && !it.disposalRemark?.trim()) {
      throw new BadRequestException('disposalRemark is required when disposalReason=D (其他)');
    }
    const snap = await this.loadPartSnapshot(tx, tenantId, it.partId.trim());
    const partVersionId = await this.loadActivePartVersionId(tx, tenantId, it.partId.trim());
    const qty = new PrismaNs.Decimal(it.qty);
    // unitCost 在 DRAFT 階段先抓當下 avgCost、過帳時若有 drift 重新抓
    const unitCost = await this.resolveUnitCost(tx, tenantId, headerWarehouseId, it.partId.trim());
    await tx.nx03DisposalItem.create({
      data: {
        disposalId: ds.id,
        lineNo,
        partId: it.partId.trim(),
        partNo: snap.partNo,
        partName: snap.partName,
        partVersionId,
        locationId: it.locationId.trim(),
        qty,
        unitCost,
        totalCost: this.totalCost(qty, unitCost),
        disposalReason: it.disposalReason,
        disposalRemark: it.disposalRemark?.trim() || null,
        remark: it.remark?.trim() || null,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
    });
  }

  /**
   * 過帳：每明細走 applyQtyOutWithLedger（source=W、helper 內部用 stock_balance.avgCost）
   * Crown Q-B1=a 不簽核、D → P 一步到位
   * W5 異常鏈 Step 3：skipLedger=true（來源異常單帳已調：盤點就地調帳 / 銷退壞品不入庫）
   *   → 只驗明細、不寫 ledger（報廢單純記錄實物處理、防重複扣帳）
   */
  private async applyDisposalPosting(
    tx: Prisma.TransactionClient,
    ds: Prisma.Nx03DisposalGetPayload<{ select: typeof DS_SEL }>,
    userId: string,
    skipLedger = false,
  ) {
    const items = await tx.nx03DisposalItem.findMany({
      where: { disposalId: ds.id },
      select: { ...DS_ITEM_SEL },
    });
    if (!items.length) throw new BadRequestException('Disposal has no items to post');
    if (skipLedger) return;

    for (const item of items) {
      const qtyOut = new PrismaNs.Decimal(item.qty);
      if (qtyOut.lte(0)) continue;
      await applyQtyOutWithLedger(tx, {
        tenantId: ds.tenantId,
        userId,
        partId: item.partId,
        warehouseId: ds.warehouseId,
        locationId: item.locationId,
        qtyOut,
        sourceModule: 'NX03',
        sourceDocType: 'W',
        sourceDocId: ds.id,
        sourceItemId: item.id,
        partVersionId: item.partVersionId,
      });
    }
  }

  async update(user: RequestUser, id: string, dto: UpdateDisposalDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx03Disposal.findFirst({ where: { id, tenantId }, select: DS_SEL });
    if (!existing) throw new NotFoundException('Disposal not found');
    if (existing.voidedAt) throw new BadRequestException('Disposal is voided');

    if (dto.status !== undefined && dto.status !== existing.status) {
      assertDisposalStatusTransition(existing.status, dto.status);
    }

    let skippedLedger = false;
    return this.prisma.$transaction(async (tx) => {
      if (dto.status === DisposalStatus.POSTED && existing.status === DisposalStatus.DRAFT) {
        const head = await tx.nx03Disposal.findFirst({ where: { id, tenantId }, select: DS_SEL });
        if (!head) throw new NotFoundException('Disposal not found');
        // W5 異常鏈 Step 3：來源異常單帳已調（盤點 / 銷退壞品）→ 免扣帳、防重複扣
        skippedLedger = head.sourceIssueReportId
          ? await isOffBookIssueReport(tx, tenantId, head.sourceIssueReportId)
          : false;
        await this.applyDisposalPosting(tx, head, user.sub, skippedLedger);
        // W5 異常鏈 Step 3：過帳完成 → 來源異常單回寫自動結案（同交易）
        if (head.sourceIssueReportId) {
          await closeIssueReportFromDisposition(tx, {
            tenantId,
            issueReportId: head.sourceIssueReportId,
            dispositionDocNo: head.docNo,
            userId: user.sub,
          });
        }
        await tx.nx03Disposal.update({
          where: { id },
          data: {
            status: DisposalStatus.POSTED,
            postedAt: new Date(),
            postedBy: user.sub,
            ...(dto.disposalDate !== undefined ? { disposalDate: new Date(dto.disposalDate) } : {}),
            ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
            updatedBy: user.sub,
          },
        });
        // ⭐ 總帳脊椎 C3 2026-08-01：報廢接上總帳（只加這一行、⛔ 不動任何營運邏輯）
        // 成本 0 不開傳票：不良品倉成本本來就是 0，報廢只減數量、沒有會計事件。
        // W5 免扣帳的處置單（帳已由盤點／銷退調過）沒有庫存流水 → 自然 skip，不會重複記。
        await postDisposalToGl(tx, { tenantId, disposalId: id, userId: user.sub });
      } else {
        await tx.nx03Disposal.update({
          where: { id },
          data: {
            ...(dto.disposalDate !== undefined ? { disposalDate: new Date(dto.disposalDate) } : {}),
            ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
            ...(dto.status !== undefined ? { status: dto.status } : {}),
            updatedBy: user.sub,
          },
        });
      }
      const full = await tx.nx03Disposal.findFirst({
        where: { id },
        select: { ...DS_SEL, items: { orderBy: { lineNo: 'asc' }, select: DS_ITEM_SEL } },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: dto.status === DisposalStatus.POSTED ? 'POST' : 'UPDATE',
        entityTable: 'nx03_disposal',
        entityId: id,
        entityCode: existing.docNo,
        summary:
          dto.status === DisposalStatus.POSTED
            ? skippedLedger
              ? '報廢過帳（來源異常帳已調、免扣帳）'
              : '報廢過帳'
            : '修改報廢單',
        beforeData: existing as object,
        afterData: full as object,
      });
      return full;
    });
  }

  async softDelete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx03Disposal.findFirst({ where: { id, tenantId }, select: DS_SEL });
    if (!existing) throw new NotFoundException('Disposal not found');
    if (existing.voidedAt) throw new BadRequestException('Disposal already voided');
    if (existing.status === DisposalStatus.POSTED) throw new BadRequestException('Cannot void posted disposal');
    assertDisposalStatusTransition(existing.status, DisposalStatus.VOIDED);
    await this.prisma.nx03Disposal.update({
      where: { id },
      data: { voidedAt: new Date(), voidedBy: user.sub, status: DisposalStatus.VOIDED, updatedBy: user.sub },
    });
    const full = await this.prisma.nx03Disposal.findFirst({
      where: { id },
      select: { ...DS_SEL, items: { orderBy: { lineNo: 'asc' }, select: DS_ITEM_SEL } },
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: 'DELETE',
      entityTable: 'nx03_disposal',
      entityId: id,
      entityCode: existing.docNo,
      summary: '作廢報廢單',
      beforeData: existing as object,
      afterData: full as object,
    });
    return full;
  }

  async addItem(user: RequestUser, disposalId: string, dto: CreateDisposalItemDto) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx03Disposal.findFirst({ where: { id: disposalId, tenantId }, select: DS_SEL });
    if (!head) throw new NotFoundException('Disposal not found');
    if (head.voidedAt) throw new BadRequestException('Disposal is voided');
    this.assertItemsEditable(head.status);
    return this.prisma.$transaction(async (tx) => {
      const maxLine = await tx.nx03DisposalItem.aggregate({ where: { disposalId }, _max: { lineNo: true } });
      const lineNo = (maxLine._max.lineNo ?? 0) + 1;
      await this.addItemTx(tx, user, head, head.warehouseId, lineNo, dto);
      const row = await tx.nx03DisposalItem.findFirst({
        where: { disposalId, lineNo },
        select: DS_ITEM_SEL,
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: 'CREATE',
        entityTable: 'nx03_disposal_item',
        entityId: row!.id,
        entityCode: head.docNo,
        summary: '新增報廢明細',
        afterData: row as object,
      });
      return row;
    });
  }

  async patchItem(user: RequestUser, disposalId: string, itemId: string, dto: PatchDisposalItemDto) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx03Disposal.findFirst({ where: { id: disposalId, tenantId }, select: DS_SEL });
    if (!head) throw new NotFoundException('Disposal not found');
    if (head.voidedAt) throw new BadRequestException('Disposal is voided');
    this.assertItemsEditable(head.status);
    const existing = await this.prisma.nx03DisposalItem.findFirst({
      where: { id: itemId, disposalId },
      select: DS_ITEM_SEL,
    });
    if (!existing) throw new NotFoundException('Disposal item not found');

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
      let locationId = existing.locationId;
      if (dto.locationId !== undefined) {
        const loc = await tx.nx01Location.findFirst({
          where: { id: dto.locationId.trim(), tenantId, warehouseId: head.warehouseId },
          select: { id: true },
        });
        if (!loc) throw new BadRequestException('locationId must belong to header warehouse');
        locationId = dto.locationId.trim();
      }
      const qty = dto.qty !== undefined ? new PrismaNs.Decimal(dto.qty) : new PrismaNs.Decimal(existing.qty);
      const unitCost = new PrismaNs.Decimal(existing.unitCost);
      const disposalReason = dto.disposalReason ?? existing.disposalReason as 'A' | 'B' | 'C' | 'D';
      const disposalRemark =
        dto.disposalRemark !== undefined ? (dto.disposalRemark?.trim() || null) : existing.disposalRemark;
      if (disposalReason === 'D' && !disposalRemark?.trim()) {
        throw new BadRequestException('disposalRemark is required when disposalReason=D (其他)');
      }
      const row = await tx.nx03DisposalItem.update({
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
          disposalReason,
          disposalRemark,
          ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
          updatedBy: user.sub,
        },
        select: DS_ITEM_SEL,
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX03',
        action: 'UPDATE',
        entityTable: 'nx03_disposal_item',
        entityId: itemId,
        entityCode: head.docNo,
        summary: '修改報廢明細',
        beforeData: existing as object,
        afterData: row as object,
      });
      return row;
    });
  }

  async removeItem(user: RequestUser, disposalId: string, itemId: string) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx03Disposal.findFirst({ where: { id: disposalId, tenantId }, select: DS_SEL });
    if (!head) throw new NotFoundException('Disposal not found');
    if (head.voidedAt) throw new BadRequestException('Disposal is voided');
    this.assertItemsEditable(head.status);
    const existing = await this.prisma.nx03DisposalItem.findFirst({
      where: { id: itemId, disposalId },
      select: DS_ITEM_SEL,
    });
    if (!existing) throw new NotFoundException('Disposal item not found');
    await this.prisma.nx03DisposalItem.delete({ where: { id: itemId } });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX03',
      action: 'DELETE',
      entityTable: 'nx03_disposal_item',
      entityId: itemId,
      entityCode: head.docNo,
      summary: '刪除報廢明細',
      beforeData: existing as object,
    });
    return { ok: true };
  }
}

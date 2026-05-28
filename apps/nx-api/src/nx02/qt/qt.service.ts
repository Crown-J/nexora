// apps/nx-api/src/nx02/qt/qt.service.ts
// B5 RFQ/QT API 主 service — 對應意圖版 v2 §3.1~§3.5 + §5.1~§5.5
//
// 5 個業務動作：
//   listRfqsForPurchase  §3.1  採購工作台 list
//   addQt                §3.2  新增同行報價（每次 insert 新筆）
//   adoptQt              §3.3  採用 QT（含連帶 reject 兄弟 + 建 TI + 反查 SO line item）
//   rejectQt             §3.4  拒絕單筆 QT
//   cancelRfq            §3.5  取消整個 RFQ
//
// retry：runWithRetry 包整段 transaction，catch P2034/40P01/55P03 → exponential backoff（同 D4 §3.2）

import { Injectable, Logger } from '@nestjs/common';
import { Prisma as PrismaNs, type Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { Nx02AdvisoryLock } from '../../shared/nx02/nx02-advisory-lock';
import { resolveCurrencyId } from '../../shared/nx02/nx02-currency';
import { allocDocNo } from '../../shared/nx02/nx02-doc-no';
import { assertRfqStatusTransition, RfqStatus } from '../../shared/nx02/nx02-state-machine';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  CancelRfqBodyDto,
  CreateQtDto,
  ListRfqQueryDto,
  RejectQtBodyDto,
} from './dto/qt.dto';
import {
  CancelReasonRequiredError,
  Nx02BaseError,
  Nx02BusyError,
  Nx02SystemError,
  PartnerNotInquiryTypeError,
  QtAlreadyAgreedError,
  QtAlreadyRejectedError,
  QtNotFoundError,
  RejectReasonRequiredError,
  RfqAlreadyClosedError,
  RfqNotFoundError,
  RfqNotTransferInquiryError,
} from './qt-error';

const RETRY_BACKOFFS_MS = [50, 200, 800];

const QT_SEL = {
  id: true,
  tenantId: true,
  rfqId: true,
  inquiryPartnerId: true,
  quotedPrice: true,
  quotedQuantity: true,
  leadDays: true,
  status: true,
  notes: true,
  rejectReason: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

const RFQ_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  rfqDate: true,
  warehouseId: true,
  supplierId: true,
  status: true,
  rfqType: true,
  rfqReason: true,
  currency: true,
  sourceSoItemId: true,
  voidedAt: true,
  createdAt: true,
} as const;

type QtRow = Prisma.Nx02QtGetPayload<{ select: typeof QT_SEL }>;
type RfqRow = Prisma.Nx02RfqGetPayload<{ select: typeof RFQ_SEL }>;

@Injectable()
export class Nx02QtService {
  private readonly logger = new Logger(Nx02QtService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  // ===== §3.1 list RFQ for purchase workbench =====

  async listRfqsForPurchase(user: RequestUser, q: ListRfqQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.Nx02RfqWhereInput = { tenantId, voidedAt: null };
    if (q.status?.trim()) where.status = q.status.trim();
    if (q.rfqType?.trim()) where.rfqType = q.rfqType.trim();

    const [total, rfqs] = await Promise.all([
      this.prisma.nx02Rfq.count({ where }),
      this.prisma.nx02Rfq.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: pageSize,
        select: {
          ...RFQ_SEL,
          rev_Nx02RfqItem_rfqId: {
            orderBy: { lineNo: 'asc' },
            select: { partId: true, partNo: true, partName: true, qty: true },
          },
        },
      }),
    ]);

    if (rfqs.length === 0) return { page, pageSize, total, rows: [] };

    const rfqIds = rfqs.map((r) => r.id);
    // 一次抓所有 QT 統計，避免 N+1
    const qtGrouped = await this.prisma.nx02Qt.groupBy({
      by: ['rfqId', 'inquiryPartnerId'],
      where: { rfqId: { in: rfqIds } },
      _count: { _all: true },
    });
    const summaryByRfq = new Map<string, { qtCount: number; distinctPartnerCount: number }>();
    for (const row of qtGrouped) {
      const cur = summaryByRfq.get(row.rfqId) ?? { qtCount: 0, distinctPartnerCount: 0 };
      cur.qtCount += row._count._all;
      cur.distinctPartnerCount += 1;
      summaryByRfq.set(row.rfqId, cur);
    }

    let qtRows: QtRow[] = [];
    if (q.includeQts) {
      qtRows = await this.prisma.nx02Qt.findMany({
        where: { rfqId: { in: rfqIds } },
        orderBy: [{ rfqId: 'asc' }, { inquiryPartnerId: 'asc' }, { createdAt: 'desc' }],
        select: QT_SEL,
      });
    }
    const qtsByRfq = new Map<string, QtRow[]>();
    for (const qt of qtRows) {
      const arr = qtsByRfq.get(qt.rfqId) ?? [];
      arr.push(qt);
      qtsByRfq.set(qt.rfqId, arr);
    }

    const rows = rfqs.map((rfq) => {
      const { rev_Nx02RfqItem_rfqId, ...rest } = rfq;
      const summary = summaryByRfq.get(rfq.id) ?? { qtCount: 0, distinctPartnerCount: 0 };
      return {
        ...rest,
        items: rev_Nx02RfqItem_rfqId,
        qtCount: summary.qtCount,
        distinctPartnerCount: summary.distinctPartnerCount,
        ...(q.includeQts ? { qts: qtsByRfq.get(rfq.id) ?? [] } : {}),
      };
    });

    return { page, pageSize, total, rows };
  }

  /**
   * M3-redo-3b：list quotes by RFQ id（並排比價視圖用）。
   * 排序：quotedPrice 升冪（最低價在前）+ createdAt 升冪 tie-break。
   * include inquiryPartner 顯示供應商代碼/名稱。
   */
  async listQuotesByRfqId(user: RequestUser, rfqId: string) {
    const tenantId = requireTenantId(user);
    const rfq = await this.prisma.nx02Rfq.findFirst({
      where: { id: rfqId, tenantId },
      select: { id: true, rfqType: true, docNo: true },
    });
    if (!rfq) throw new RfqNotFoundError(rfqId);

    const quotes = await this.prisma.nx02Qt.findMany({
      where: { tenantId, rfqId },
      orderBy: [{ quotedPrice: 'asc' }, { createdAt: 'asc' }],
      select: {
        ...QT_SEL,
        inquiryPartner: { select: { code: true, name: true, partnerType: true } },
      },
    });
    return { rfqId: rfq.id, rfqDocNo: rfq.docNo, rfqType: rfq.rfqType, quotes };
  }

  // ===== §3.2 add QT =====

  async addQt(user: RequestUser, dto: CreateQtDto): Promise<QtRow> {
    const tenantId = requireTenantId(user);
    return this.runWithRetry(() =>
      this.prisma.$transaction(
        async (tx) => {
          const rfq = await this.loadRfqOrThrow(tx, tenantId, dto.rfqId.trim());
          this.assertRfqOpenForWrite(rfq);
          await this.assertPartnerIsInquiry(tx, tenantId, dto.inquiryPartnerId.trim(), rfq.rfqType);

          const qt = await tx.nx02Qt.create({
            data: {
              tenantId,
              rfqId: rfq.id,
              inquiryPartnerId: dto.inquiryPartnerId.trim(),
              quotedPrice: new PrismaNs.Decimal(dto.quotedPrice),
              quotedQuantity: new PrismaNs.Decimal(dto.quotedQuantity),
              leadDays: dto.leadDays ?? null,
              notes: dto.notes?.trim() || null,
              status: 'P',
              createdBy: user.sub,
              updatedBy: user.sub,
            },
            select: QT_SEL,
          });

          // 推 RFQ status：DRAFT/SENT → REPLIED（first-QT-in 推進；REPLIED 已是不動）
          if (rfq.status === RfqStatus.DRAFT || rfq.status === RfqStatus.SENT) {
            assertRfqStatusTransition(rfq.status, RfqStatus.REPLIED);
            await tx.nx02Rfq.update({
              where: { id: rfq.id },
              data: { status: RfqStatus.REPLIED, updatedBy: user.sub },
            });
          }

          await this.audit.write({
            tenantId,
            actorUserId: user.sub,
            moduleCode: 'NX02',
            action: 'CREATE',
            entityTable: 'nx02_qt',
            entityId: qt.id,
            entityCode: rfq.docNo,
            summary: `新增同行報價 partner=${dto.inquiryPartnerId.trim()} price=${dto.quotedPrice} qty=${dto.quotedQuantity}`,
            afterData: qt as object,
          });

          return qt;
        },
        { isolationLevel: PrismaNs.TransactionIsolationLevel.ReadCommitted },
      ),
    );
  }

  // ===== §3.3 + §5.5 adopt QT =====

  async adoptQt(user: RequestUser, qtId: string) {
    const tenantId = requireTenantId(user);
    const start = Date.now();
    const result = await this.runWithRetry(() =>
      this.prisma.$transaction(
        async (tx) => {
          // 先讀一次取得 rfqId（用來鎖）
          const qtPre = await this.loadQtOrThrow(tx, tenantId, qtId.trim());
          await Nx02AdvisoryLock.lockRfqId(tx, tenantId, qtPre.rfqId);

          // 拿鎖後重讀（拿鎖前可能被別人改）
          const qt = await this.loadQtOrThrow(tx, tenantId, qtId.trim());
          if (qt.status === 'A') throw new QtAlreadyAgreedError(qt.id);
          if (qt.status === 'R') throw new QtAlreadyRejectedError(qt.id);

          const rfq = await this.loadRfqOrThrow(tx, tenantId, qt.rfqId);
          if (rfq.status === RfqStatus.CLOSED || rfq.status === RfqStatus.CANCELLED) {
            throw new RfqAlreadyClosedError(rfq.id, rfq.status);
          }
          // B5 採用 QT 路徑只服務同行調貨（rfqType='P'）。一般詢價走 PO 流程，不在 B5 範圍。
          if (rfq.rfqType !== 'P') {
            throw new RfqNotTransferInquiryError(rfq.id);
          }
          // 理論不可達：rfqType='P' 必由 D4 stub 建立含 sourceSoItemId
          const sourceSoItemId = rfq.sourceSoItemId;
          if (!sourceSoItemId) {
            throw new Nx02SystemError(
              new Error(`RFQ ${rfq.id} rfqType='P' but sourceSoItemId is null`),
            );
          }

          // 1. 該 QT → AGREED
          const adoptedQt = await tx.nx02Qt.update({
            where: { id: qt.id },
            data: { status: 'A', rejectReason: null, updatedBy: user.sub },
            select: QT_SEL,
          });

          // 2. 同 RFQ 其他 status='P' QT → REJECTED（含同 partner 較舊歷史）
          const siblingReason = `因採用 QT-${qt.id}`;
          const siblingResult = await tx.nx02Qt.updateMany({
            where: { rfqId: qt.rfqId, status: 'P', id: { not: qt.id } },
            data: { status: 'R', rejectReason: siblingReason, updatedBy: user.sub },
          });

          // 3. RFQ → CLOSED（state machine REPLIED → CLOSED）
          assertRfqStatusTransition(rfq.status, RfqStatus.CLOSED);
          await tx.nx02Rfq.update({
            where: { id: rfq.id },
            data: { status: RfqStatus.CLOSED, updatedBy: user.sub },
          });

          // 4. 建 TI（header + 1 line item）
          const ti = await this.createTiFromQt(tx, user, tenantId, rfq, adoptedQt, sourceSoItemId);

          // 5. 反查並更新 SO line item（rfqType='P' 一定有 sourceSoItemId，前面已 assert）
          await this.linkTiToSoItem(tx, user, sourceSoItemId, ti.id);

          await this.audit.write({
            tenantId,
            actorUserId: user.sub,
            moduleCode: 'NX02',
            action: 'UPDATE',
            entityTable: 'nx02_qt',
            entityId: qt.id,
            entityCode: rfq.docNo,
            summary: `採用 QT-${qt.id} 建立 TI-${ti.docNo}（連帶 reject ${siblingResult.count} 筆兄弟 QT）`,
            afterData: adoptedQt as object,
          });

          return {
            qtId: adoptedQt.id,
            rfqId: rfq.id,
            tiId: ti.id,
            tiDocNo: ti.docNo,
            rejectedSiblingCount: siblingResult.count,
            linkedSoItemId: sourceSoItemId,
          };
        },
        { isolationLevel: PrismaNs.TransactionIsolationLevel.ReadCommitted },
      ),
    );

    const elapsed = Date.now() - start;
    this.logger.log(
      `Adopted QT ${result.qtId} tenant=${tenantId} ti=${result.tiDocNo} ` +
        `rejectedSiblings=${result.rejectedSiblingCount} linkedSo=${result.linkedSoItemId ?? 'none'} elapsedMs=${elapsed}`,
    );
    return result;
  }

  // ===== §3.4 reject single QT =====

  async rejectQt(user: RequestUser, qtId: string, dto: RejectQtBodyDto): Promise<QtRow> {
    const tenantId = requireTenantId(user);
    if (!dto.rejectReason?.trim()) throw new RejectReasonRequiredError();

    return this.prisma.$transaction(async (tx) => {
      const qt = await this.loadQtOrThrow(tx, tenantId, qtId.trim());
      if (qt.status === 'A') throw new QtAlreadyAgreedError(qt.id);
      if (qt.status === 'R') throw new QtAlreadyRejectedError(qt.id);

      const updated = await tx.nx02Qt.update({
        where: { id: qt.id },
        data: { status: 'R', rejectReason: dto.rejectReason.trim(), updatedBy: user.sub },
        select: QT_SEL,
      });

      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX02',
        action: 'UPDATE',
        entityTable: 'nx02_qt',
        entityId: qt.id,
        summary: `拒絕單筆 QT，原因：${dto.rejectReason.trim()}`,
        beforeData: qt as object,
        afterData: updated as object,
      });

      return updated;
    });
  }

  // ===== §3.5 cancel RFQ =====

  async cancelRfq(user: RequestUser, rfqId: string, dto: CancelRfqBodyDto) {
    const tenantId = requireTenantId(user);
    if (!dto.cancelReason?.trim()) throw new CancelReasonRequiredError();
    const cancelReason = dto.cancelReason.trim();

    return this.prisma.$transaction(async (tx) => {
      const rfq = await this.loadRfqOrThrow(tx, tenantId, rfqId.trim());
      if (rfq.status === RfqStatus.CLOSED || rfq.status === RfqStatus.CANCELLED) {
        throw new RfqAlreadyClosedError(rfq.id, rfq.status);
      }
      assertRfqStatusTransition(rfq.status, RfqStatus.CANCELLED);

      // 1. 所有 status='P' QT → REJECTED（reject_reason 系統訊息）
      const qtReason = `因 RFQ 取消：${cancelReason}`;
      const qtResult = await tx.nx02Qt.updateMany({
        where: { rfqId: rfq.id, status: 'P' },
        data: { status: 'R', rejectReason: qtReason, updatedBy: user.sub },
      });

      // 2. RFQ → CANCELLED
      const cancelled = await tx.nx02Rfq.update({
        where: { id: rfq.id },
        data: { status: RfqStatus.CANCELLED, voidedAt: new Date(), voidedBy: user.sub, updatedBy: user.sub },
        select: RFQ_SEL,
      });

      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX02',
        action: 'UPDATE',
        entityTable: 'nx02_rfq',
        entityId: rfq.id,
        entityCode: rfq.docNo,
        summary: `取消 RFQ，原因：${cancelReason}（連帶 reject ${qtResult.count} 筆 pending QT）`,
        beforeData: rfq as object,
        afterData: cancelled as object,
      });

      return { rfqId: rfq.id, cancelledQtCount: qtResult.count };
    });
  }

  // ===== private helpers =====

  private async loadRfqOrThrow(
    tx: Prisma.TransactionClient,
    tenantId: string,
    rfqId: string,
  ): Promise<RfqRow> {
    const rfq = await tx.nx02Rfq.findFirst({
      where: { id: rfqId, tenantId },
      select: RFQ_SEL,
    });
    if (!rfq) throw new RfqNotFoundError(rfqId);
    return rfq;
  }

  private async loadQtOrThrow(
    tx: Prisma.TransactionClient,
    tenantId: string,
    qtId: string,
  ): Promise<QtRow> {
    const qt = await tx.nx02Qt.findFirst({
      where: { id: qtId, tenantId },
      select: QT_SEL,
    });
    if (!qt) throw new QtNotFoundError(qtId);
    return qt;
  }

  private assertRfqOpenForWrite(rfq: RfqRow): void {
    if (rfq.voidedAt) throw new RfqAlreadyClosedError(rfq.id, 'VOIDED');
    if (rfq.status === RfqStatus.CLOSED || rfq.status === RfqStatus.CANCELLED) {
      throw new RfqAlreadyClosedError(rfq.id, rfq.status);
    }
  }

  /**
   * M2-e：依 rfq.rfqType 分流 partner_type guard。
   *   - rfqType='G' 一般詢價 → Qt 對象必為 partner_type='S' 純供應商
   *   - rfqType='P' 同行調貨詢價 → Qt 對象必為 partner_type='O' 同行
   * partner 改制六分類後語意分家：S 純供應商不再兼任「同行」業務。
   */
  private async assertPartnerIsInquiry(
    tx: Prisma.TransactionClient,
    tenantId: string,
    partnerId: string,
    rfqType: string,
  ): Promise<void> {
    const expectedType = rfqType === 'G' ? 'S' : 'O';
    const p = await tx.nx01Partner.findFirst({
      where: { id: partnerId, tenantId, isActive: true, partnerType: expectedType },
      select: { id: true },
    });
    if (!p) throw new PartnerNotInquiryTypeError(partnerId);
  }

  private async createTiFromQt(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    tenantId: string,
    rfq: RfqRow,
    qt: QtRow,
    sourceSoItemId: string, // 由 caller 負責保證非 null（adoptQt 已 assert）
  ): Promise<{ id: string; docNo: string }> {
    // 取倉庫 code 用於單號
    const wh = await tx.nx01Warehouse.findFirst({
      where: { id: rfq.warehouseId, tenantId },
      select: { code: true },
    });
    if (!wh) {
      throw new Nx02SystemError(new Error(`warehouse ${rfq.warehouseId} not found for RFQ ${rfq.id}`));
    }

    // RFQ stub 通常只有 1 個 line item（D4 翻譯一個料號一個 RFQ）
    const rfqItem = await tx.nx02RfqItem.findFirst({
      where: { rfqId: rfq.id },
      orderBy: { lineNo: 'asc' },
      select: { id: true, partId: true, partNo: true, partName: true },
    });
    if (!rfqItem) {
      throw new Nx02SystemError(new Error(`RFQ ${rfq.id} has no line item`));
    }

    const docNo = await allocDocNo(tx, tenantId, 'TI', wh.code);
    const currencyId = await resolveCurrencyId(tx, rfq.currency);
    const qty = qt.quotedQuantity;
    const unitCost = qt.quotedPrice;
    const subtotal = qty.mul(unitCost).toDecimalPlaces(2);
    const taxRate = new PrismaNs.Decimal('5.00');
    const taxAmount = subtotal.mul(taxRate).div(100).toDecimalPlaces(2);
    const totalAmount = subtotal.add(taxAmount).toDecimalPlaces(2);

    const ti = await tx.nx02Ti.create({
      data: {
        tenantId,
        warehouseId: rfq.warehouseId,
        docNo,
        tiDate: new Date(),
        partnerId: qt.inquiryPartnerId,
        rfqId: rfq.id,
        currencyId,
        status: 'D',
        subtotal,
        taxRate,
        taxAmount,
        totalAmount,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: { id: true, docNo: true },
    });

    await tx.nx02TiItem.create({
      data: {
        tiId: ti.id,
        rfqItemId: rfqItem.id,
        lineNo: 1,
        partId: rfqItem.partId,
        partNo: rfqItem.partNo,
        partName: rfqItem.partName,
        qty,
        unitCost,
        lineAmount: subtotal,
        sourceSoItemId,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
    });

    return ti;
  }

  private async linkTiToSoItem(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    soItemId: string,
    tiId: string,
  ): Promise<void> {
    await tx.nx04SoItem.update({
      where: { id: soItemId },
      data: {
        tiId,
        transferStatus: 'C', // 補貨完成（同行答應 = 補貨確認）
        updatedBy: user.sub,
      },
    });
  }

  // ----- retry wrapper -----

  async runWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < RETRY_BACKOFFS_MS.length; attempt++) {
      try {
        return await fn();
      } catch (e) {
        lastErr = e;
        const reason = this.retryReason(e);
        if (!reason) {
          this.rethrow(e);
        }
        const backoff = RETRY_BACKOFFS_MS[attempt];
        this.logger.warn(
          `Nx02 retry attempt=${attempt + 1} reason=${reason} backoffMs=${backoff}`,
        );
        await sleep(backoff);
      }
    }
    throw new Nx02BusyError(lastErr);
  }

  private retryReason(e: unknown): string | null {
    if (e instanceof PrismaNs.PrismaClientKnownRequestError) {
      if (e.code === 'P2034') return 'PRISMA_SERIALIZATION';
      const meta = e.meta as Record<string, unknown> | undefined;
      const sqlstate = (meta?.code ?? meta?.sqlstate ?? '') as string;
      if (sqlstate === '40P01') return 'DEADLOCK';
      if (sqlstate === '55P03') return 'LOCK_TIMEOUT';
    }
    const errAny = e as { code?: string } | null;
    if (errAny?.code === '40P01') return 'DEADLOCK';
    if (errAny?.code === '55P03') return 'LOCK_TIMEOUT';
    if (errAny?.code === 'P2034') return 'PRISMA_SERIALIZATION';
    return null;
  }

  private rethrow(e: unknown): never {
    if (e instanceof Nx02BaseError) throw e;
    if (e instanceof Error) {
      this.logger.error(`[B5 rethrow] ${e.message}`, e.stack);
      throw new Nx02SystemError(e);
    }
    throw new Nx02SystemError(e);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

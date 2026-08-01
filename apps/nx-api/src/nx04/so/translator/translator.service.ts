// apps/nx-api/src/nx04/so/translator/translator.service.ts
// D4 翻譯器主服務 — 對應 D4 意圖版 5 條邏輯（D4-impl §3.2）
//
// 流程（D4 意圖 §3.1 6 步驟）：
//   1. 校驗客戶 / 倉 / 來源 ref
//   2. acquireXactLocks（已排序）
//   3. INSERT SO header
//   4. INSERT line items（initial transferStatus 依 type 決定）
//   5. RefreshmentDocCreator 對 type != 'S' 建補貨單 + UPDATE so_item
//   6. 由 D3 trigger 1 自動同步 reserved_qty
//   COMMIT
//
// retry：runWithRetry 包整段 transaction，catch P2034/40P01/55P03 → exponential backoff

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma as PrismaNs, type Prisma } from 'db-core';

import type { RequestUser } from '../../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../../prisma/prisma.service';
import { Nx04AdvisoryLock, type LockKey } from '../../../shared/nx04/nx04-advisory-lock';
import { allocNx04DocNo } from '../../../shared/nx04/nx04-doc-no';
import { requireDefaultLocationId } from '../../../shared/nx04/nx04-location';
import { resolveCurrencyId } from '../../../shared/nx02/nx02-currency';
import { requireTenantId } from '../../../shared/nx01/require-tenant';
import { assertSellable } from '../../../shared/nx01/partner-account-gate';

import type {
  TranslateLineItemDto,
  TranslateSoDto,
  TranslateSoLineItemResult,
  TranslateSoResult,
} from './dto/translate-so.dto';
import { RefreshmentDocCreator } from './refreshment-doc-creator';
import { TransferSourceResolver } from './transfer-source-resolver';
import {
  TranslatorBusyError,
  TranslatorInvalidInputError,
  TranslatorSystemError,
} from './translator-error';

const RETRY_BACKOFFS_MS = [50, 200, 800];

/**
 * 依 transferSourceType 決定 line item 的初始 transferStatus。
 * D4 意圖 §3.5：S → 'C'（本倉夠 / 直接 completed）；T/G/B → 'P'（補貨單建好後 RefreshmentDocCreator 會立即 UPDATE 為 'I'）
 *
 * Exported as pure function for unit testing without NestJS DI.
 */
export function getInitialTransferStatus(
  transferSourceType: 'S' | 'T' | 'G' | 'B',
): 'P' | 'I' | 'C' {
  return transferSourceType === 'S' ? 'C' : 'P';
}

@Injectable()
export class Nx04SoTranslatorService {
  private readonly logger = new Logger(Nx04SoTranslatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: TransferSourceResolver,
    private readonly docCreator: RefreshmentDocCreator,
  ) {}

  async translate(user: RequestUser, dto: TranslateSoDto): Promise<TranslateSoResult> {
    const tenantId = requireTenantId(user);
    const start = Date.now();

    if (!dto.lineItems?.length) {
      throw new TranslatorInvalidInputError('EMPTY_LINE_ITEMS', 'lineItems 不可為空');
    }

    const result = await this.runWithRetry(() =>
      this.prisma.$transaction(
        async (tx) => this.translateInTx(tx, user, tenantId, dto),
        { isolationLevel: PrismaNs.TransactionIsolationLevel.ReadCommitted },
      ),
    );

    const elapsed = Date.now() - start;
    this.logger.log(
      `Translated SO ${result.soNumber} tenant=${tenantId} items=${dto.lineItems.length} ` +
        `it=${result.itIds.length} rfq=${result.rfqIds.length} co=${result.coIds.length} elapsedMs=${elapsed}`,
    );
    return result;
  }

  // ----- transaction 主邏輯 -----

  private async translateInTx(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    tenantId: string,
    dto: TranslateSoDto,
  ): Promise<TranslateSoResult> {
    // 1. 校驗
    const customerInfo = await this.assertCustomerC(tx, tenantId, dto.customerId.trim());
    const paymentTerm = customerInfo.paymentTerm;
    // W4 [3-6]：translator 路徑也帶 invoiceCopies；散客 L 強制 2、其他用 partner.default
    const invoiceCopies =
      customerInfo.partnerType === 'L' ? 2 : customerInfo.defaultInvoiceCopies;
    const wh = await tx.nx01Warehouse.findFirst({
      where: { id: dto.warehouseId.trim(), tenantId, isActive: true },
      select: { id: true, code: true },
    });
    if (!wh) {
      throw new TranslatorInvalidInputError(
        'WAREHOUSE_NOT_IN_TENANT',
        `出貨倉庫 '${dto.warehouseId}' 不存在或停用`,
      );
    }
    await this.resolver.resolveAll(tx, tenantId, dto.lineItems);

    // 2. acquireXactLocks（已排序、deduped）
    const lockKeys: LockKey[] = Nx04AdvisoryLock.collectUniqueKeys(tenantId, dto.lineItems);
    await Nx04AdvisoryLock.acquireXactLocks(tx, lockKeys);

    // 3. INSERT SO header
    const currencyId = await resolveCurrencyId(tx, dto.currencyId);
    const taxRate = new PrismaNs.Decimal(dto.taxRate);
    const docNo = await allocNx04DocNo(tx, tenantId, 'SO', wh.code);
    const so = await tx.nx04So.create({
      data: {
        tenantId,
        docNo,
        warehouseId: wh.id,
        soDate: new Date(),
        customerId: dto.customerId.trim(),
        deliveryType: dto.deliveryType.trim(),
        sourceType: 'S', // trigger 4 會強制覆蓋 — 給什麼都會被 reset
        currencyId,
        taxRate,
        subtotal: 0,
        taxAmount: 0,
        totalAmount: 0,
        status: 'CONFIRMED', // translator 出來的 SO 直接 CONFIRMED（跳過 DRAFT）
        paymentTerm,
        invoiceCopies, // W4 [3-6]
        remark: dto.remark?.trim() || null,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: { id: true, docNo: true, warehouseId: true, status: true, currencyId: true },
    });

    // 4. INSERT line items + 收集回傳結構
    const inserted = await this.insertLineItems(tx, user, tenantId, so.id, dto.lineItems);

    // 5. 對 type != 'S' 建補貨單（內部會 UPDATE line item.transferStatus = 'I' + 設 stId/coId）
    const refreshments = await this.docCreator.createForLineItems({
      tx,
      user,
      tenantId,
      so: { ...so, warehouseCode: wh.code, customerId: dto.customerId.trim() },
      items: inserted,
      dtoLineItems: dto.lineItems,
    });

    // 6. 重新讀取 line items 拿到最新狀態（trigger 1/3 觸發後的值 + RefreshmentDocCreator update 後的值）
    const finalItems = await tx.nx04SoItem.findMany({
      where: { soId: so.id },
      orderBy: { lineNo: 'asc' },
      select: {
        id: true,
        partId: true,
        warehouseId: true,
        qty: true,
        transferSourceType: true,
        transferStatus: true,
        fulfillStatus: true,
        stId: true,
        tiId: true,
        coId: true,
      },
    });

    return {
      soId: so.id,
      soNumber: so.docNo,
      status: so.status,
      lineItems: finalItems.map<TranslateSoLineItemResult>((it) => ({
        lineItemId: it.id,
        partId: it.partId,
        warehouseId: it.warehouseId,
        qty: it.qty.toString(),
        transferSourceType: it.transferSourceType as 'S' | 'T' | 'G' | 'B',
        transferStatus: it.transferStatus as 'P' | 'I' | 'C',
        fulfillStatus: it.fulfillStatus as 'W' | 'PK' | 'PL' | 'D' | 'F',
        relatedItId: it.stId,
        relatedTiId: it.tiId,
        relatedCoId: it.coId,
      })),
      itIds: refreshments.itIds,
      rfqIds: refreshments.rfqIds,
      coIds: refreshments.coIds,
    };
  }

  private async insertLineItems(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    tenantId: string,
    soId: string,
    items: TranslateLineItemDto[],
  ) {
    const inserted: Array<{
      id: string;
      partId: string;
      warehouseId: string;
      qty: PrismaNs.Decimal;
      transferSourceType: string;
      transferSourceRef: string | null;
      partNo: string;
      partName: string;
    }> = [];

    let lineNo = 1;
    for (const it of items) {
      const part = await tx.nx01Part.findFirst({
        where: { id: it.partId.trim(), tenantId },
        select: { code: true, name: true },
      });
      if (!part) {
        throw new TranslatorInvalidInputError(
          'PART_NOT_IN_TENANT',
          `第 ${lineNo} 項：料號 '${it.partId}' 不屬於目前租戶`,
        );
      }
      const wh = await tx.nx01Warehouse.findFirst({
        where: { id: it.warehouseId.trim(), tenantId, isActive: true },
        select: { id: true },
      });
      if (!wh) {
        throw new TranslatorInvalidInputError(
          'WAREHOUSE_NOT_IN_TENANT',
          `第 ${lineNo} 項：line item 倉庫 '${it.warehouseId}' 不存在或停用`,
        );
      }
      const locationId = await requireDefaultLocationId(tx, tenantId, wh.id);
      const qty = new PrismaNs.Decimal(it.qty);
      const unit = new PrismaNs.Decimal(it.unitPrice);
      const lineAmount = qty.mul(unit).toDecimalPlaces(2);

      const initialTransferStatus = getInitialTransferStatus(it.transferSourceType);

      const created = await tx.nx04SoItem.create({
        data: {
          soId,
          lineNo,
          partId: part.code === undefined ? it.partId : it.partId.trim(),
          partNo: part.code,
          partName: part.name,
          warehouseId: wh.id,
          locationId,
          qty,
          unitPrice: unit,
          lineAmount,
          reservedQty: 0, // trigger 1 會重算
          remark: it.remark?.trim() || null,
          transferSourceType: it.transferSourceType,
          transferStatus: initialTransferStatus,
          fulfillStatus: 'W',
          // itemStatus 不寫 — trigger 3 會雙寫
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: { id: true },
      });

      inserted.push({
        id: created.id,
        partId: it.partId.trim(),
        warehouseId: wh.id,
        qty,
        transferSourceType: it.transferSourceType,
        transferSourceRef: it.transferSourceRef?.trim() || null,
        partNo: part.code,
        partName: part.name,
      });
      lineNo++;
    }

    return inserted;
  }

  private async assertCustomerC(
    tx: Prisma.TransactionClient,
    tenantId: string,
    partnerId: string,
  ): Promise<{ paymentTerm: string; partnerType: string; defaultInvoiceCopies: number }> {
    // 帳戶閘門 v1.3（2026-07-21、取代類型閘門）：散客 L／現金客戶／R 收款帳戶 三擇一
    const p = await tx.nx01Partner.findFirst({
      where: { id: partnerId, tenantId, isActive: true },
      select: { id: true, paymentTermDomestic: true, partnerType: true, isCashCustomer: true, defaultInvoiceCopies: true },
    });
    if (!p) {
      throw new TranslatorInvalidInputError(
        'CUSTOMER_NOT_C_PARTNER',
        `客戶 '${partnerId}' 不存在或已停用`,
      );
    }
    try {
      await assertSellable(tx, tenantId, p);
    } catch {
      throw new TranslatorInvalidInputError(
        'CUSTOMER_NOT_C_PARTNER',
        `客戶 '${partnerId}' 尚未開立收款帳戶（也非散客/現金客戶）、無法銷售`,
      );
    }
    return {
      paymentTerm: p.paymentTermDomestic ?? 'NET30',
      partnerType: p.partnerType,
      defaultInvoiceCopies: p.defaultInvoiceCopies,
    };
  }

  // ----- retry wrapper（D4-impl §2 取捨 2）-----

  async runWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < RETRY_BACKOFFS_MS.length; attempt++) {
      try {
        return await fn();
      } catch (e) {
        lastErr = e;
        const reason = this.retryReason(e);
        if (!reason) {
          // 不是 retryable 錯誤 → 直接拋
          this.rethrow(e);
        }
        // WARN log（per Crown 拍板 Q5 附加要求 — lock_timeout / deadlock 都走 WARN）
        const backoff = RETRY_BACKOFFS_MS[attempt];
        this.logger.warn(
          `Translate retry attempt=${attempt + 1} reason=${reason} backoffMs=${backoff}`,
        );
        await sleep(backoff);
      }
    }
    // 3 次都 retry 失敗
    throw new TranslatorBusyError(lastErr);
  }

  /** 回傳 retryable 原因 string，不是 retryable 則回 null */
  private retryReason(e: unknown): string | null {
    if (e instanceof PrismaNs.PrismaClientKnownRequestError) {
      // P2034: prisma serialization
      if (e.code === 'P2034') return 'PRISMA_SERIALIZATION';
      // 其他 Prisma 錯有時把 PG sqlstate 包進 meta
      const meta = e.meta as Record<string, unknown> | undefined;
      const sqlstate = (meta?.code ?? meta?.sqlstate ?? '') as string;
      if (sqlstate === '40P01') return 'DEADLOCK';
      if (sqlstate === '55P03') return 'LOCK_TIMEOUT';
    }
    // 直接的 PostgreSQL 錯（pg driver） — code 屬性
    const errAny = e as { code?: string } | null;
    if (errAny?.code === '40P01') return 'DEADLOCK';
    if (errAny?.code === '55P03') return 'LOCK_TIMEOUT';
    if (errAny?.code === 'P2034') return 'PRISMA_SERIALIZATION';
    return null;
  }

  private rethrow(e: unknown): never {
    if (e instanceof TranslatorInvalidInputError) throw e;
    if (e instanceof BadRequestException) {
      throw new TranslatorInvalidInputError('EMPTY_LINE_ITEMS', e.message, e);
    }
    if (e instanceof Error) {
      throw new TranslatorSystemError(e);
    }
    throw new TranslatorSystemError(e);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

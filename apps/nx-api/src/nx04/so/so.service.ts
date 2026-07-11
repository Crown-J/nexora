import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { composePartnerDefaultShippingAddress } from '../../shared/nx01/compose-partner-address';
import { resolveCurrencyId } from '../../shared/nx02/nx02-currency';
import { allocDocNo as allocNx02DocNo } from '../../shared/nx02/nx02-doc-no';
import {
  createDemandsFromSoShortage,
  ignoreDemandsForCancelledSo,
} from '../../shared/nx02/nx02-demand-from-so';
import { allocNx04DocNo } from '../../shared/nx04/nx04-doc-no';
import { requireDefaultLocationId } from '../../shared/nx04/nx04-location';
import { Nx04ListQueryDto } from '../../shared/nx04/nx04-list-query.dto';
import {
  assertSoStatusTransition,
  QuoteStatus,
  SoStatus,
} from '../../shared/nx04/nx04-state-machine';
import { autoCreateTransferFromSo } from '../../shared/nx03/nx03-auto-transfer-from-so';
import { applyQtyOutWithLedger } from '../../shared/nx03/nx03-inventory';
import { createArFromShippedSo } from '../../shared/nx05/nx05-create-ar-from-so';
import { createDeliveryDnFromShippedSo } from '../../shared/nx06/nx06-create-delivery-from-so';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';
// NX04-IMPL-01 Phase 3 commit 3a：授信擋單接點（Crown Q7 + Q-C4=A）
import { CreditGuardService } from '../credit-guard/credit-guard.service';
// F2 組合套餐 2026-06-09：分攤 bundlePrice 到各 line
import { BundleService } from '../bundle/bundle.service';
// F1-E 引擎 2026-06-09：取建議價 + 警示
import { PromotionEngineService } from '../promotion/promotion-engine.service';
// NX04-M2 §A C2：拉報價建 SO 時 cascade quote 失效
import { QuoteService } from '../quote/quote.service';

import type { CreateSoDto, CreateSoItemDto, CreateTiFromSoDto, PatchSoItemDto, UpdateSoDto } from './dto/so.dto';

/**
 * 補貨來源 → 補貨進度狀態（NX04-M2 §A C2 連動）
 * S 本倉現貨 → C 補貨完成（無需補）
 * T 自倉調撥 / G 同行調貨 / B 客戶訂單 → P 待補
 */
function deriveTransferStatus(sourceType: string): string {
  return sourceType === 'S' ? 'C' : 'P';
}

/**
 * 05 補做 D1 2026-06-09：header 揀貨狀態 = lines 中最落後的 fulfillStatus。
 * 值序：W(等貨) < PK(撿貨中) < PL(包貨中) < D(配送中) < F(已送達)
 * 顯示瓶頸：只要還有 line 在等貨、header 就標 W。
 */
const FULFILL_ORDER: Record<string, number> = { W: 0, PK: 1, PL: 2, D: 3, F: 4 };
function derivePickingStatus(items: { fulfillStatus?: string }[]): string | null {
  if (!items || items.length === 0) return null;
  let worst: string | null = null;
  let worstRank = 99;
  for (const it of items) {
    const s = it.fulfillStatus;
    if (!s) continue;
    const r = FULFILL_ORDER[s] ?? 99;
    if (r < worstRank) {
      worst = s;
      worstRank = r;
    }
  }
  return worst;
}

/**
 * 05 補做 C6 2026-06-09：所有 lines 都 fulfillStatus='F'（已送達）→ true
 * SO 自動推 COMPLETED 的判斷依據；空 items 視為 false（不應推進）。
 */
function isAllLinesDelivered(items: { fulfillStatus?: string }[]): boolean {
  if (!items || items.length === 0) return false;
  return items.every((it) => it.fulfillStatus === 'F');
}

const SO_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  warehouseId: true,
  soDate: true,
  customerId: true,
  quoteId: true,
  deliveryType: true,
  deliveryAddress: true,
  sourceType: true,
  currencyId: true,
  subtotal: true,
  taxRate: true,
  taxAmount: true,
  totalAmount: true,
  status: true,
  paymentTerm: true,
  // W4 [3-6] 發票聯式（0=不開/2/3、建單時從 partner.defaultInvoiceCopies 帶入、可逐筆改）
  invoiceCopies: true,
  // F1 特價售出 2026-06-08：標記此 SO 來自異常處置 X 處置
  specialPriceFlag: true,
  // 05 補做 C2/C3/C4 2026-06-09：業務員 / 銷貨方式 / 帳款年月
  salesPersonId: true,
  salesMethod: true,
  accountPeriod: true,
  remark: true,
  cancelledAt: true,
  cancelledBy: true,
  cancelReason: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  // NX04-QT-SHELL 2026-07-07：單據模板需顯示名稱欄（比照 QuoteService enrich）
  customer: { select: { code: true, name: true } },
  warehouse: { select: { code: true, name: true } },
  currency: { select: { code: true } },
  salesPerson: { select: { userName: true } },
} as const;

// W4 [3-5] 散客 L 強制二聯（service 端守門、不允許 SO 對散客客戶改 invoiceCopies）
const RETAIL_PARTNER_TYPE = 'L';
const RETAIL_INVOICE_COPIES = 2;

const SO_ITEM_SEL = {
  id: true,
  soId: true,
  quoteItemId: true,
  lineNo: true,
  partId: true,
  partNo: true,
  partName: true,
  // 05 補做 B5 2026-06-09：廠牌 snapshot（建單時 snapshot 自 part.brand）
  brandId: true,
  brandName: true,
  warehouseId: true,
  locationId: true,
  qty: true,
  unitPrice: true,
  lineAmount: true,
  reservedQty: true,
  // F1-E 銷貨促銷引擎 2026-06-09：低於 cost/minPrice 時必填的理由（沿用 QuoteService 範式）
  belowMinReason: true,
  // F2 組合套餐 2026-06-09：line 屬於哪個套餐（null=非套餐）
  bundleId: true,
  remark: true,
  itemStatus: true,
  /// NX04-M3 C2 自行判斷項：UI 雙段狀態組合 + IT-O 警示橫條偵測依賴此 4 欄位、
  /// 純加 SELECT projection、不改業務邏輯
  transferSourceType: true,
  transferStatus: true,
  fulfillStatus: true,
  tiId: true,
  // 偉盟設計檢視 P1-5 2026-07-10：實際出貨料號（替代出貨）
  actualPartId: true,
  actualPartNo: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

const Q_ITEM_MIN = {
  id: true,
  quoteId: true,
  lineNo: true,
  partId: true,
  partNo: true,
  partName: true,
  qty: true,
  unitPrice: true,
  transferredQty: true,
  isSelected: true,
} as const;

function mapSoItemApi<T extends { unitPrice: PrismaNs.Decimal | unknown }>(row: T) {
  const u = row.unitPrice as PrismaNs.Decimal;
  return { ...row, unitPriceSnapshot: u };
}

// NX04-QT-SHELL 2026-07-07：把 SO_SEL 帶的 customer/warehouse/currency/salesPerson 關聯攤平成
//   customerCode/customerName/warehouseCode/warehouseName/currencyCode/salesPersonName（比照 QuoteService）。
//   剝掉關聯物件本身、避免回傳巢狀重複。createdByName 由呼叫端另補（需查 user）。
function flattenSoRefs<T extends Record<string, unknown>>(rest: T) {
  const { customer, warehouse, currency, salesPerson, ...plain } = rest as Record<string, unknown> & {
    customer?: { code?: string; name?: string } | null;
    warehouse?: { code?: string; name?: string } | null;
    currency?: { code?: string } | null;
    salesPerson?: { userName?: string } | null;
  };
  return {
    ...plain,
    customerCode: customer?.code ?? null,
    customerName: customer?.name ?? null,
    warehouseCode: warehouse?.code ?? null,
    warehouseName: warehouse?.name ?? null,
    currencyCode: currency?.code ?? null,
    salesPersonName: salesPerson?.userName ?? null,
  };
}

@Injectable()
export class SoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
    // NX04-IMPL-01 Phase 3 commit 3a：授信擋單 inject（Crown Q7 4 機制）
    private readonly creditGuard: CreditGuardService,
    // NX04-M2 §A C2：cascade QT 失效 wire
    private readonly quoteService: QuoteService,
    // F1-E 銷貨促銷引擎 2026-06-09：開單時取建議價 + belowMinReason 警示
    private readonly promotionEngine: PromotionEngineService,
    // F2 組合套餐 2026-06-09：套用套餐到 SO 時分攤 bundlePrice
    private readonly bundleService: BundleService,
  ) {}

  /**
   * F1-E 開單套用促銷引擎：把 unitPrice 跟 cost/minPrice 比、必要時要求 belowMinReason。
   * 邏輯沿用 QuoteService.assertMinPriceReason：unitPrice < minPrice → 必填 belowMinReason，
   * Alex F1-E：「最終單價 ≤ 成本 → 警示 + 必填 belowMinReason」（出清/即期破底線照走、填理由放行）。
   */
  private async assertSoLinePriceReason(
    user: RequestUser,
    customerId: string,
    partId: string,
    qty: PrismaNs.Decimal,
    unitPrice: PrismaNs.Decimal,
    warehouseId: string,
    belowMinReason: string | null | undefined,
  ): Promise<void> {
    const r = await this.promotionEngine.resolvePrice(user, {
      customerId,
      partId,
      qty: qty.toString(),
      warehouseId,
    });
    const minPriceTrigger =
      r.minPrice !== null && unitPrice.lt(new PrismaNs.Decimal(r.minPrice));
    const costTrigger = r.cost !== null && unitPrice.lte(new PrismaNs.Decimal(r.cost));
    if ((minPriceTrigger || costTrigger) && !belowMinReason?.trim()) {
      throw new BadRequestException(
        `unitPrice (${unitPrice.toString()}) 低於 ${
          costTrigger ? `成本 ${r.cost}` : `最低售價 ${r.minPrice}`
        }；belowMinReason 必填`,
      );
    }
  }

  private whereList(tenantId: string, q: Nx04ListQueryDto): Prisma.Nx04SoWhereInput {
    const where: Prisma.Nx04SoWhereInput = { tenantId, cancelledAt: null };
    if (q.status?.trim()) where.status = q.status.trim();
    if (q.search?.trim()) {
      const s = q.search.trim();
      // NX04-QT-SHELL：搜尋含 單號/備註/客戶編號/客戶名稱（比照 QuoteService）
      where.OR = [
        { docNo: { contains: s, mode: 'insensitive' } },
        { remark: { contains: s, mode: 'insensitive' } },
        { customer: { code: { contains: s, mode: 'insensitive' } } },
        { customer: { name: { contains: s, mode: 'insensitive' } } },
      ];
    }
    return where;
  }

  /**
   * 校驗 customerId 為 partner_type IN ('C', 'O', 'L')（保養廠 / 同行 / 散客）+ isActive、回傳 partner 完整資訊
   * partner 改制七分類：W4 [3-5] 加散客 L（手冊 §3.5「銷貨單客戶欄可直接選散客」）
   */
  private async assertCustomerC(tx: Prisma.TransactionClient, tenantId: string, partnerId: string) {
    const p = await tx.nx01Partner.findFirst({
      where: { id: partnerId, tenantId, isActive: true, partnerType: { in: ['C', 'O', 'L'] } },
      select: {
        id: true,
        partnerType: true,
        paymentTermDomestic: true,
        defaultWarehouseId: true,
        creditLimit: true,
        creditStatus: true,
        // W4 [3-6]：建單時從 customer 帶入 invoiceCopies 預設值
        defaultInvoiceCopies: true,
      },
    });
    if (!p) throw new BadRequestException("customerId must be an active partner with partnerType IN ('C', 'O', 'L')");
    return p;
  }

  /**
   * W4 [3-6] 解 SO invoiceCopies 寫入值：
   * - 散客 L 強制 RETAIL_INVOICE_COPIES（2）、不可手動覆寫
   * - 其他 partner：dto.invoiceCopies > customer.defaultInvoiceCopies > 3（fallback）
   */
  private resolveInvoiceCopies(
    customer: { partnerType: string; defaultInvoiceCopies: number },
    dtoInvoiceCopies: number | undefined,
  ): number {
    if (customer.partnerType === RETAIL_PARTNER_TYPE) return RETAIL_INVOICE_COPIES;
    return dtoInvoiceCopies ?? customer.defaultInvoiceCopies ?? 3;
  }

  private lineAmount(qty: PrismaNs.Decimal, unit: PrismaNs.Decimal) {
    return qty.mul(unit).toDecimalPlaces(2);
  }

  private async loadPartSnapshot(tx: Prisma.TransactionClient, tenantId: string, partId: string) {
    const p = await tx.nx01Part.findFirst({
      where: { id: partId, tenantId },
      // 05 補做 B5 2026-06-09：snapshot 廠牌（避免主檔 brand 更名後影響歷史 SO 顯示）
      select: { code: true, name: true, brandId: true, brand: { select: { name: true } } },
    });
    if (!p) throw new NotFoundException(`Part ${partId} not found`);
    return {
      partNo: p.code,
      partName: p.name,
      brandId: p.brandId ?? null,
      brandName: p.brand?.name ?? null,
    };
  }

  private async recalcSoTotals(tx: Prisma.TransactionClient, soId: string, taxRate: PrismaNs.Decimal) {
    const items = await tx.nx04SoItem.findMany({
      where: { soId },
      select: { lineAmount: true },
    });
    let sub = new PrismaNs.Decimal(0);
    for (const it of items) sub = sub.add(it.lineAmount);
    const tax = sub.mul(taxRate).div(100).toDecimalPlaces(2);
    const total = sub.add(tax);
    await tx.nx04So.update({
      where: { id: soId },
      data: { subtotal: sub, taxAmount: tax, totalAmount: total },
    });
  }

  private assertSoItemsEditable(status: string) {
    if (status !== SoStatus.DRAFT && status !== SoStatus.CONFIRMED && status !== SoStatus.PICKING) {
      throw new BadRequestException('SO line items are not editable in current status');
    }
  }

  private mapDetail(row: { rev_Nx04SoItem_soId: unknown[] } & Record<string, unknown>) {
    const { rev_Nx04SoItem_soId: items, ...rest } = row;
    const mappedItems = (items as object[]).map((it) => mapSoItemApi(it as never));
    return {
      ...flattenSoRefs(rest),
      // 05 補做 D1 2026-06-09：揀貨/出貨整體進度 = lines 中最落後的 fulfillStatus
      // 值序：W(等貨) < PK(撿貨中) < PL(包貨中) < D(配送中) < F(已送達)
      // null=無 lines；UI 直接拿這欄顯示「header 揀貨狀態」
      pickingStatus: derivePickingStatus(mappedItems as { fulfillStatus?: string }[]),
      items: mappedItems,
    };
  }

  private async applySoShipping(
    tx: Prisma.TransactionClient,
    so: { id: string; tenantId: string },
    userId: string,
  ) {
    const items = await tx.nx04SoItem.findMany({
      where: { soId: so.id },
      select: { ...SO_ITEM_SEL },
    });
    if (!items.length) throw new BadRequestException('SO has no items to ship');
    for (const item of items) {
      const qtyOut = new PrismaNs.Decimal(String(item.qty));
      if (!qtyOut.gt(0)) continue;
      const locId =
        item.locationId?.trim() ||
        (await requireDefaultLocationId(tx, so.tenantId, item.warehouseId));
      // M1 配套：load active part_version snapshot 帶入 ledger（NX03-IMPL-01 Phase 5 commit 1）
      const partVersion = await tx.nx01PartVersion.findFirst({
        where: { tenantId: so.tenantId, partId: item.partId, effectiveTo: null },
        orderBy: { versionNo: 'desc' },
        select: { id: true },
      });
      await applyQtyOutWithLedger(tx, {
        tenantId: so.tenantId,
        userId,
        partId: item.partId,
        warehouseId: item.warehouseId,
        locationId: locId,
        qtyOut,
        sourceModule: 'NX04',
        sourceDocType: 'S',
        sourceDocId: so.id,
        sourceItemId: item.id,
        partVersionId: partVersion?.id ?? null,
      });
    }
  }

  async list(user: RequestUser, q: Nx04ListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx04So.count({ where }),
      this.prisma.nx04So.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        // NX04-QT-SHELL：單據模板列表需 建單人員名 + 項目數
        select: { ...SO_SEL, _count: { select: { rev_Nx04SoItem_soId: true } } },
      }),
    ]);
    // 建單人員名（批次查 user）
    const creatorIds = [...new Set(rows.map((r) => r.createdBy).filter(Boolean))];
    const creators = creatorIds.length
      ? await this.prisma.nx01User.findMany({ where: { id: { in: creatorIds } }, select: { id: true, userName: true } })
      : [];
    const creatorMap = new Map(creators.map((c) => [c.id, c.userName]));
    const items = rows.map((r) => {
      const { _count, ...rest } = r as typeof r & { _count: { rev_Nx04SoItem_soId: number } };
      const flat = flattenSoRefs(rest as never);
      return {
        ...flat,
        itemCount: _count?.rev_Nx04SoItem_soId ?? 0,
        createdByName: creatorMap.get(r.createdBy) ?? null,
      };
    });
    return { page, pageSize, total, items };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx04So.findFirst({
      where: { id, tenantId },
      select: {
        ...SO_SEL,
        rev_Nx04SoItem_soId: { orderBy: { lineNo: 'asc' }, select: SO_ITEM_SEL },
      },
    });
    if (!row) throw new NotFoundException('SO not found');
    const mapped = this.mapDetail(row as never);
    // NX04-QT-SHELL：建單人員名（詳情顯示）
    const creator = row.createdBy
      ? await this.prisma.nx01User.findFirst({ where: { id: row.createdBy }, select: { userName: true } })
      : null;
    return { ...mapped, createdByName: creator?.userName ?? null };
  }

  async create(user: RequestUser, dto: CreateSoDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const customer = await this.assertCustomerC(tx, tenantId, dto.customerId.trim());

      // NX04-IMPL-01 Phase 3 commit 3a 接點 1：客戶預設據點 fallback
      // dto.warehouseId 為主、無 → fallback customer.defaultWarehouseId（M1 配套）
      // 2026-07-11 補齊承諾三層鏈（建單面板文案：客戶預設倉→使用者隸屬倉→主倉）：
      //   隸屬倉取主要倉（isPrimary）優先、僅單倉隸屬時取該倉；最後 fallback 租戶主倉（isMain）
      let effectiveWhId = dto.warehouseId?.trim() || customer.defaultWarehouseId;
      if (!effectiveWhId) {
        const uw = await tx.nx01UserWarehouse.findMany({
          where: { tenantId, userId: user.sub, isActive: true },
          select: { warehouseId: true, isPrimary: true },
        });
        effectiveWhId =
          uw.find((r) => r.isPrimary)?.warehouseId ?? (uw.length === 1 ? uw[0]?.warehouseId : null) ?? null;
      }
      if (!effectiveWhId) {
        const main = await tx.nx01Warehouse.findFirst({
          where: { tenantId, isMain: true, isActive: true },
          select: { id: true },
        });
        effectiveWhId = main?.id ?? null;
      }
      if (!effectiveWhId) {
        throw new BadRequestException(
          '無法決定出貨倉庫（未指定、客戶無預設倉、使用者無隸屬倉、租戶無主倉）',
        );
      }
      const wh = await tx.nx01Warehouse.findFirst({
        where: { id: effectiveWhId, tenantId },
        select: { id: true, code: true },
      });
      if (!wh) throw new BadRequestException('warehouseId invalid');

      const currencyId = await resolveCurrencyId(tx, dto.currencyId);
      const taxRate = new PrismaNs.Decimal(dto.taxRate);
      const docNo = await allocNx04DocNo(tx, tenantId, 'SO', wh.code);

      // NX04-IMPL-01 Phase 3 commit 3a 接點 4：授信擋單呼叫（Crown Q-C4=A 4 機制順序）
      // 預估 SO 總額（含稅、tx 外呼叫 service 不行、用 dto.items 預算）
      const estimatedSubtotal = (dto.items ?? []).reduce(
        (acc, it) => acc.add(new PrismaNs.Decimal(it.qty).mul(new PrismaNs.Decimal(it.unitPriceSnapshot))),
        new PrismaNs.Decimal(0),
      );
      const estimatedTotal = estimatedSubtotal.add(estimatedSubtotal.mul(taxRate).div(100)).toDecimalPlaces(2);
      // CreditGuard 4 機制 check（黑名單→額度→逾期→付款條件）
      // 注意：creditGuard.check 不在 tx 內、純查詢 + decide
      const creditResult = await this.creditGuard.check(user, {
        customerId: customer.id,
        soAmount: Number(estimatedTotal.toString()),
        paymentTerm: customer.paymentTermDomestic ?? undefined,
      });
      const paymentTerm = creditResult.adjustedPaymentTerm;

      // 02 對齊第二批前端收尾軌 FE-CP4 2026-06-07：SO 自動帶 partner 預設送貨地址
      // dto 沒給 deliveryAddress 時、從 partner_address SHIPPING isDefault 取一筆組字串
      let deliveryAddressResolved: string | null =
        (dto as { deliveryAddress?: string }).deliveryAddress?.trim() || null;
      if (!deliveryAddressResolved) {
        const defaultShipping = await composePartnerDefaultShippingAddress(
          this.prisma,
          tenantId,
          dto.customerId.trim(),
        );
        deliveryAddressResolved = defaultShipping?.oneLine ?? null;
      }

      const so = await tx.nx04So.create({
        data: {
          tenantId,
          docNo,
          warehouseId: wh.id,
          soDate: new Date(dto.soDate),
          customerId: dto.customerId.trim(),
          quoteId: dto.quoteId?.trim() || null,
          deliveryType: dto.deliveryType.trim(),
          deliveryAddress: deliveryAddressResolved,
          sourceType: 'S',
          currencyId,
          taxRate,
          subtotal: 0,
          taxAmount: 0,
          totalAmount: 0,
          status: SoStatus.DRAFT,
          paymentTerm,
          // W4 [3-6] 發票聯式：散客 L 強制 2、其他從 customer.defaultInvoiceCopies 帶入、dto 可手動覆寫
          invoiceCopies: this.resolveInvoiceCopies(customer, dto.invoiceCopies),
          // F1 特價售出 2026-06-08：來自異常處置 X 處置的特價 SO 旗標
          specialPriceFlag: dto.specialPriceFlag ?? false,
          // 05 補做 C2/C3/C4 2026-06-09：業務員 / 銷貨方式 / 帳款年月
          salesPersonId: dto.salesPersonId?.trim() || null,
          salesMethod: dto.salesMethod?.trim() || null,
          // C4：帳款年月、給了用之、未給 default = soDate 月份第一天
          accountPeriod: dto.accountPeriod
            ? new Date(dto.accountPeriod)
            : new Date(new Date(dto.soDate).toISOString().slice(0, 8) + '01'),
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: SO_SEL,
      });
      let line = 1;
      if (dto.items?.length) {
        for (const it of dto.items) {
          // F1-E 銷貨促銷引擎 2026-06-09：unitPrice ≤ cost 或 < minPrice → 必填 belowMinReason
          // F2 組合套餐 2026-06-09：bundleId 非空 → 跳過引擎檢查（套餐價即最終價、避免重複折）
          if (!it.bundleId?.trim()) {
            await this.assertSoLinePriceReason(
              user,
              dto.customerId.trim(),
              it.partId.trim(),
              new PrismaNs.Decimal(it.qty),
              new PrismaNs.Decimal(it.unitPriceSnapshot),
              it.warehouseId.trim(),
              it.belowMinReason,
            );
          }
          await this.createSoItemTx(tx, user, so.id, line++, it);
        }
      }
      await this.recalcSoTotals(tx, so.id, taxRate);

      // NX04-M2 §A C2：cascade 報價失效（同 tx、確保原子性）
      // 找 dto.items 內所有 quoteItemId 對應的 quoteId / partId、
      // 加上 dto.quoteId（header 拉的整張 quote）一併處理。
      const itemQuoteItemIds = (dto.items ?? [])
        .map((i) => i.quoteItemId?.trim())
        .filter((x): x is string => !!x);
      const adoptedQuoteIdSet = new Set<string>();
      const adoptedPartIdSet = new Set<string>();
      if (itemQuoteItemIds.length) {
        const qItems = await tx.nx04QuoteItem.findMany({
          where: { id: { in: itemQuoteItemIds } },
          select: { quoteId: true, partId: true },
        });
        for (const qi of qItems) {
          adoptedQuoteIdSet.add(qi.quoteId);
          adoptedPartIdSet.add(qi.partId);
        }
      }
      if (dto.quoteId?.trim()) adoptedQuoteIdSet.add(dto.quoteId.trim());
      if (adoptedQuoteIdSet.size || adoptedPartIdSet.size) {
        await this.quoteService.cascadeOnSoAdopt(
          tx,
          tenantId,
          dto.customerId.trim(),
          Array.from(adoptedQuoteIdSet),
          Array.from(adoptedPartIdSet),
          user.sub,
        );
      }

      // v1.2 階段 I P3：銷貨缺貨自動建採購需求（demandType='O' 客訂）
      // Alex Q2=a 拍板：SO DRAFT 即時建、Alex 認可 a+b 混合 + cancel→I
      // 冪等：helper 內部依 remark prefix '[SO:.../IT:itemId]' 去重
      await createDemandsFromSoShortage(tx, {
        tenantId,
        soId: so.id,
        userId: user.sub,
        expectedDate: null,
      });

      const full = await tx.nx04So.findFirst({
        where: { id: so.id },
        select: {
          ...SO_SEL,
          rev_Nx04SoItem_soId: { orderBy: { lineNo: 'asc' }, select: SO_ITEM_SEL },
        },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX04',
        action: 'CREATE',
        entityTable: 'nx04_so',
        entityId: so.id,
        entityCode: so.docNo,
        summary: '建立銷貨單',
        afterData: full as object,
      });
      return this.mapDetail(full as never);
    });
  }

  /**
   * 拉報價 picker：列出該客戶 OPEN 狀態的 QT 行（NX04-M2 §A C2）
   * 給 SO 開單 UI「拉舊報價」用、回傳剩餘可轉量、按 createdAt desc 排序
   * 範圍：tenantId + customerId + quote.status IN (DRAFT, SENT, ACCEPTED) + voided=null
   *      + isSelected=true（多選項分組中客戶確認的那筆）
   *      + transferredQty < qty（還有可轉量）
   */
  async listOpenQuoteLines(user: RequestUser, customerId: string) {
    const tenantId = requireTenantId(user);
    const rows = await this.prisma.nx04QuoteItem.findMany({
      where: {
        isSelected: true,
        quote: {
          tenantId,
          customerId,
          voidedAt: null,
          status: { in: [QuoteStatus.DRAFT, QuoteStatus.SENT, QuoteStatus.ACCEPTED] },
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        quoteId: true,
        partId: true,
        partNo: true,
        partName: true,
        qty: true,
        transferredQty: true,
        unitPrice: true,
        minPrice: true,
        belowMinReason: true,
        createdAt: true,
        quote: { select: { docNo: true, quoteDate: true, status: true, warehouseId: true } },
      },
    });
    return rows
      .filter((r) => new PrismaNs.Decimal(r.transferredQty).lt(new PrismaNs.Decimal(r.qty)))
      .map((r) => ({
        quoteItemId: r.id,
        quoteId: r.quoteId,
        docNo: r.quote.docNo,
        quoteDate: r.quote.quoteDate,
        quoteStatus: r.quote.status,
        warehouseId: r.quote.warehouseId,
        partId: r.partId,
        partNo: r.partNo,
        partName: r.partName,
        qty: r.qty,
        transferredQty: r.transferredQty,
        remainQty: new PrismaNs.Decimal(r.qty).sub(new PrismaNs.Decimal(r.transferredQty)),
        unitPrice: r.unitPrice,
        minPrice: r.minPrice,
        belowMinReason: r.belowMinReason,
        createdAt: r.createdAt,
      }));
  }

  private async createSoItemTx(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    soId: string,
    lineNo: number,
    it: CreateSoItemDto,
  ) {
    const tenantId = requireTenantId(user);
    const whId = it.warehouseId.trim();
    const locId = it.locationId?.trim() || (await requireDefaultLocationId(tx, tenantId, whId));
    const loc = await tx.nx01Location.findFirst({
      where: { id: locId, tenantId, warehouseId: whId },
      select: { id: true },
    });
    if (!loc) throw new BadRequestException('locationId must belong to item warehouse');
    const snap = await this.loadPartSnapshot(tx, tenantId, it.partId.trim());
    const qty = new PrismaNs.Decimal(it.qty);
    const unit = new PrismaNs.Decimal(it.unitPriceSnapshot);
    // NX04-M2 §A C2：補貨來源 + 雙段狀態連動（schema default S/C/W、可由業務手動指定）
    const transferSourceType = (it.transferSourceType?.trim() || 'S').toUpperCase();
    const transferStatus = deriveTransferStatus(transferSourceType);
    await tx.nx04SoItem.create({
      data: {
        soId,
        lineNo,
        quoteItemId: it.quoteItemId?.trim() || null,
        partId: it.partId.trim(),
        partNo: snap.partNo,
        partName: snap.partName,
        // 05 補做 B5 2026-06-09：廠牌 snapshot
        brandId: snap.brandId,
        brandName: snap.brandName,
        warehouseId: whId,
        locationId: locId,
        qty,
        unitPrice: unit,
        lineAmount: this.lineAmount(qty, unit),
        reservedQty: new PrismaNs.Decimal(0),
        belowMinReason: it.belowMinReason?.trim() || null,
        // F2 組合套餐 2026-06-09：line 屬於哪個套餐（null=非套餐）
        bundleId: it.bundleId?.trim() || null,
        remark: it.remark?.trim() || null,
        itemStatus: 'WP',
        transferSourceType,
        transferStatus,
        // fulfillStatus 沿用 schema default 'W'（等貨）、出貨流程推進
        createdBy: user.sub,
        updatedBy: user.sub,
      },
    });
    // NX04-M2 §A C2：拉舊報價時、累加 QT line transferredQty（避免重複轉）
    if (it.quoteItemId?.trim()) {
      const qItem = await tx.nx04QuoteItem.findFirst({
        where: { id: it.quoteItemId.trim() },
        select: { id: true, qty: true, transferredQty: true },
      });
      if (qItem) {
        const newTq = new PrismaNs.Decimal(qItem.transferredQty).add(qty);
        const cap = new PrismaNs.Decimal(qItem.qty);
        await tx.nx04QuoteItem.update({
          where: { id: qItem.id },
          data: {
            transferredQty: newTq.gt(cap) ? cap : newTq,
            updatedBy: user.sub,
          },
        });
      }
    }
  }

  async createFromQuote(user: RequestUser, quoteId: string) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const q = await tx.nx04Quote.findFirst({
        where: { id: quoteId, tenantId, voidedAt: null },
        select: {
          ...{
            id: true,
            warehouseId: true,
            customerId: true,
            currencyId: true,
            taxRate: true,
            status: true,
            validUntil: true,
          },
          rev_Nx04QuoteItem_quoteId: { orderBy: { lineNo: 'asc' }, select: Q_ITEM_MIN },
        },
      });
      if (!q) throw new NotFoundException('Quote not found');
      if (q.status !== QuoteStatus.SENT && q.status !== QuoteStatus.ACCEPTED) {
        throw new BadRequestException('Quote must be SENT or ACCEPTED to convert to SO');
      }
      if (q.validUntil) {
        const vu = new Date(q.validUntil);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (vu < today) throw new BadRequestException('Quote has expired (validUntil)');
      }
      const customer = await this.assertCustomerC(tx, tenantId, q.customerId);
      const paymentTerm = customer.paymentTermDomestic;
      const wh = await tx.nx01Warehouse.findFirst({
        where: { id: q.warehouseId, tenantId },
        select: { code: true },
      });
      if (!wh) throw new BadRequestException('Quote warehouse invalid');
      const docNo = await allocNx04DocNo(tx, tenantId, 'SO', wh.code);
      const so = await tx.nx04So.create({
        data: {
          tenantId,
          docNo,
          warehouseId: q.warehouseId,
          soDate: new Date(),
          customerId: q.customerId,
          quoteId: q.id,
          deliveryType: 'P',
          sourceType: 'S',
          currencyId: q.currencyId,
          taxRate: q.taxRate,
          subtotal: 0,
          taxAmount: 0,
          totalAmount: 0,
          status: SoStatus.DRAFT,
          paymentTerm,
          // W4 [3-6] 從 quote→SO 轉、走 customer.defaultInvoiceCopies；散客 L 強制 2（service helper）
          invoiceCopies: this.resolveInvoiceCopies(customer, undefined),
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: SO_SEL,
      });
      const items = q.rev_Nx04QuoteItem_quoteId.filter((i) => i.isSelected);
      let lineNo = 1;
      let anyLine = false;
      for (const qi of items) {
        const remain = new PrismaNs.Decimal(qi.qty).sub(new PrismaNs.Decimal(qi.transferredQty));
        if (remain.lte(0)) continue;
        anyLine = true;
        const locId = await requireDefaultLocationId(tx, tenantId, q.warehouseId);
        await tx.nx04SoItem.create({
          data: {
            soId: so.id,
            lineNo: lineNo++,
            quoteItemId: qi.id,
            partId: qi.partId,
            partNo: qi.partNo,
            partName: qi.partName,
            warehouseId: q.warehouseId,
            locationId: locId,
            qty: remain,
            unitPrice: new PrismaNs.Decimal(qi.unitPrice),
            lineAmount: this.lineAmount(remain, new PrismaNs.Decimal(qi.unitPrice)),
            reservedQty: new PrismaNs.Decimal(0),
            itemStatus: 'WP',
            createdBy: user.sub,
            updatedBy: user.sub,
          },
        });
        const newTq = new PrismaNs.Decimal(qi.transferredQty).add(remain);
        await tx.nx04QuoteItem.update({
          where: { id: qi.id },
          data: { transferredQty: newTq, updatedBy: user.sub },
        });
      }
      if (!anyLine) throw new BadRequestException('No remaining qty on selected quote lines to transfer');
      await this.recalcSoTotals(tx, so.id, new PrismaNs.Decimal(String(q.taxRate)));
      const full = await tx.nx04So.findFirst({
        where: { id: so.id },
        select: {
          ...SO_SEL,
          rev_Nx04SoItem_soId: { orderBy: { lineNo: 'asc' }, select: SO_ITEM_SEL },
        },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX04',
        action: 'CREATE',
        entityTable: 'nx04_so',
        entityId: so.id,
        entityCode: so.docNo,
        summary: '由報價單建立銷貨單',
        afterData: full as object,
      });
      return this.mapDetail(full as never);
    });
  }

  async update(user: RequestUser, id: string, dto: UpdateSoDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx04So.findFirst({ where: { id, tenantId }, select: SO_SEL });
    if (!existing) throw new NotFoundException('SO not found');
    if (existing.cancelledAt) throw new BadRequestException('SO is cancelled');

    if (dto.status !== undefined && dto.status !== existing.status) {
      assertSoStatusTransition(existing.status, dto.status);
    }
    if (dto.status === SoStatus.CANCELLED && !dto.cancelReason?.trim()) {
      throw new BadRequestException('cancelReason is required when cancelling SO');
    }

    const deliveryPatch =
      dto.deliveryType !== undefined || dto.deliveryAddress !== undefined ? true : false;
    if (deliveryPatch) {
      if (
        existing.status === SoStatus.SHIPPED ||
        existing.status === SoStatus.INVOICED ||
        existing.status === SoStatus.CANCELLED
      ) {
        throw new BadRequestException('Cannot change delivery fields after ship/cancel');
      }
      const nextType = (dto.deliveryType ?? existing.deliveryType).trim();
      const nextAddr =
        dto.deliveryAddress !== undefined
          ? dto.deliveryAddress?.trim() || null
          : (existing.deliveryAddress as string | null);
      if (nextType === 'D' && !nextAddr?.trim()) {
        throw new BadRequestException('deliveryAddress is required when deliveryType is D');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const taxRate = new PrismaNs.Decimal(String(existing.taxRate));
      const headBefore = await tx.nx04So.findFirst({
        where: { id, tenantId },
        select: { id: true, tenantId: true, status: true },
      });
      if (!headBefore) throw new NotFoundException('SO not found');

      // NX04-IMPL-01 Phase 4 commit 4b：DRAFT → CONFIRMED 自動調撥強制（Crown Q-C1=C 兩階段第二段）
      // - scan SoItems、目標倉缺貨 → 從最近倉庫支援、自動建 NX03 ST 調撥單
      // - SoItem.stId 已存在 / transferStatus='C' → 冪等 skip
      // - 無倉庫支援 → throw BadRequest 提示業務員手動處理
      if (dto.status === SoStatus.CONFIRMED && headBefore.status === SoStatus.DRAFT) {
        await autoCreateTransferFromSo(tx, { tenantId, soId: id, userId: user.sub });
      }

      if (dto.status === SoStatus.SHIPPED && headBefore.status === SoStatus.PICKING) {
        await this.applySoShipping(tx, { id: headBefore.id, tenantId: headBefore.tenantId }, user.sub);
      }
      // W4 [3-6] 散客 L 銷貨單不允許改 invoiceCopies（service 守門）；其他 partner 可逐筆改
      let invoiceCopiesUpdate: number | undefined;
      if (dto.invoiceCopies !== undefined) {
        const customer = await tx.nx01Partner.findFirst({
          where: { id: existing.customerId, tenantId },
          select: { partnerType: true },
        });
        if (customer?.partnerType === RETAIL_PARTNER_TYPE && dto.invoiceCopies !== RETAIL_INVOICE_COPIES) {
          throw new BadRequestException('散客銷貨單發票聯式固定 2 聯、不可改');
        }
        invoiceCopiesUpdate = dto.invoiceCopies;
      }
      await tx.nx04So.update({
        where: { id },
        data: {
          ...(dto.soDate !== undefined ? { soDate: new Date(dto.soDate) } : {}),
          ...(dto.remark !== undefined ? { remark: dto.remark?.trim() || null } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.deliveryType !== undefined ? { deliveryType: dto.deliveryType.trim() } : {}),
          ...(dto.deliveryAddress !== undefined
            ? { deliveryAddress: dto.deliveryAddress?.trim() || null }
            : {}),
          ...(invoiceCopiesUpdate !== undefined ? { invoiceCopies: invoiceCopiesUpdate } : {}),
          // 05 補做 C2/C3/C4 2026-06-09：業務員 / 銷貨方式 / 帳款年月（patch optional）
          ...(dto.salesPersonId !== undefined
            ? { salesPersonId: dto.salesPersonId?.trim() || null }
            : {}),
          ...(dto.salesMethod !== undefined
            ? { salesMethod: dto.salesMethod?.trim() || null }
            : {}),
          ...(dto.accountPeriod !== undefined
            ? { accountPeriod: dto.accountPeriod ? new Date(dto.accountPeriod) : null }
            : {}),
          ...(dto.status === SoStatus.CANCELLED
            ? {
                cancelledAt: new Date(),
                cancelledBy: user.sub,
                cancelReason: dto.cancelReason!.trim(),
              }
            : {}),
          updatedBy: user.sub,
        },
      });
      if (dto.status === SoStatus.SHIPPED && headBefore.status === SoStatus.PICKING) {
        await createArFromShippedSo(tx, { tenantId, soId: id, userId: user.sub });
        await createDeliveryDnFromShippedSo(tx, { tenantId, soId: id, userId: user.sub });
      }
      // v1.2 階段 I P3：SO CANCELLED → 對應 demand 自動 status='I'（Alex Q2=a 拍板）
      if (dto.status === SoStatus.CANCELLED && headBefore.status !== SoStatus.CANCELLED) {
        await ignoreDemandsForCancelledSo(tx, { tenantId, soId: id, userId: user.sub });
      }
      const full = await tx.nx04So.findFirst({
        where: { id },
        select: {
          ...SO_SEL,
          rev_Nx04SoItem_soId: { orderBy: { lineNo: 'asc' }, select: SO_ITEM_SEL },
        },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX04',
        action: dto.status === SoStatus.SHIPPED ? 'POST' : 'UPDATE',
        entityTable: 'nx04_so',
        entityId: id,
        entityCode: existing.docNo,
        summary: dto.status === SoStatus.SHIPPED ? '銷貨出庫(SHIPPED)' : '修改銷貨單',
        beforeData: existing as object,
        afterData: full as object,
      });
      return this.mapDetail(full as never);
    });
  }

  async softDelete(user: RequestUser, id: string, cancelReason?: string) {
    return this.update(user, id, {
      status: SoStatus.CANCELLED,
      cancelReason: cancelReason?.trim() || 'VOID',
    });
  }

  async addItem(user: RequestUser, soId: string, dto: CreateSoItemDto) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx04So.findFirst({ where: { id: soId, tenantId }, select: SO_SEL });
    if (!head) throw new NotFoundException('SO not found');
    if (head.cancelledAt) throw new BadRequestException('SO is cancelled');
    this.assertSoItemsEditable(head.status);
    const maxLine = await this.prisma.nx04SoItem.aggregate({ where: { soId }, _max: { lineNo: true } });
    const lineNo = (maxLine._max.lineNo ?? 0) + 1;
    // F1-E 銷貨促銷引擎 2026-06-09：unitPrice ≤ cost 或 < minPrice → 必填 belowMinReason
    // F2 組合套餐 2026-06-09：bundleId 非空 → 跳過引擎檢查（套餐價即最終價、避免重複折）
    if (!dto.bundleId?.trim()) {
      await this.assertSoLinePriceReason(
        user,
        head.customerId,
        dto.partId.trim(),
        new PrismaNs.Decimal(dto.qty),
        new PrismaNs.Decimal(dto.unitPriceSnapshot),
        dto.warehouseId.trim(),
        dto.belowMinReason,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await this.createSoItemTx(tx, user, soId, lineNo, dto);
      await this.recalcSoTotals(tx, soId, new PrismaNs.Decimal(String(head.taxRate)));
    });
    const row = await this.prisma.nx04SoItem.findFirst({
      where: { soId, lineNo },
      select: SO_ITEM_SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'CREATE',
      entityTable: 'nx04_so_item',
      entityId: row!.id,
      entityCode: head.docNo,
      summary: '新增銷貨明細',
      afterData: mapSoItemApi(row!) as object,
    });
    return mapSoItemApi(row!);
  }

  async patchItem(user: RequestUser, soId: string, itemId: string, dto: PatchSoItemDto) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx04So.findFirst({ where: { id: soId, tenantId }, select: SO_SEL });
    if (!head) throw new NotFoundException('SO not found');
    if (head.cancelledAt) throw new BadRequestException('SO is cancelled');

    // NX04-IMPL-01 Phase 3 commit 3a 接點 3：配送中部分鎖（Crown Q-C2=A 4 項鎖、備註可改）
    // SHIPPED 階段：禁改 qty / unitPrice / locationId（量/地址鎖）、允許 remark
    if (head.status === SoStatus.SHIPPED) {
      if (
        dto.qty !== undefined ||
        dto.unitPriceSnapshot !== undefined ||
        dto.locationId !== undefined ||
        dto.actualPartId !== undefined // 偉盟設計檢視 P1-5：出貨後替代料號亦鎖
      ) {
        throw new ForbiddenException(
          'SO is SHIPPED (配送中)：qty / unitPrice / locationId / actualPartId 已鎖、只允許改 remark',
        );
      }
      // 純改 remark → 跳過 assertSoItemsEditable、允許更新
    } else {
      this.assertSoItemsEditable(head.status);
    }
    const existing = await this.prisma.nx04SoItem.findFirst({ where: { id: itemId, soId }, select: SO_ITEM_SEL });
    if (!existing) throw new NotFoundException('SO item not found');
    if (dto.locationId !== undefined) {
      const loc = await this.prisma.nx01Location.findFirst({
        where: { id: dto.locationId.trim(), tenantId, warehouseId: existing.warehouseId },
        select: { id: true },
      });
      if (!loc) throw new BadRequestException('locationId must belong to item warehouse');
    }
    // 偉盟設計檢視 P1-5：實際出貨料號（替代出貨）— 驗證 + code 快照；null/空字串=清除（照下單料號出）
    let actualPartData: { actualPartId: string | null; actualPartNo: string | null } | undefined;
    if (dto.actualPartId !== undefined) {
      const apId = dto.actualPartId?.trim();
      if (!apId) {
        actualPartData = { actualPartId: null, actualPartNo: null };
      } else {
        const ap = await this.prisma.nx01Part.findFirst({
          where: { id: apId, tenantId },
          select: { id: true, code: true },
        });
        if (!ap) throw new BadRequestException('actualPartId invalid for tenant');
        actualPartData = { actualPartId: ap.id, actualPartNo: ap.code };
      }
    }
    const qty = dto.qty !== undefined ? new PrismaNs.Decimal(dto.qty) : new PrismaNs.Decimal(existing.qty);
    const unit =
      dto.unitPriceSnapshot !== undefined
        ? new PrismaNs.Decimal(dto.unitPriceSnapshot)
        : new PrismaNs.Decimal(existing.unitPrice);
    // F1-E 銷貨促銷引擎 2026-06-09：qty / unitPrice 任一改、重跑警示（belowMinReason 沿用 existing 或 dto）
    // F2 組合套餐 2026-06-09：套餐 line（existing.bundleId 非空）跳過引擎檢查（套餐價即最終價）
    if ((dto.qty !== undefined || dto.unitPriceSnapshot !== undefined) && !existing.bundleId) {
      const effectiveReason =
        (dto as { belowMinReason?: string }).belowMinReason ?? existing.belowMinReason ?? undefined;
      await this.assertSoLinePriceReason(
        user,
        head.customerId,
        existing.partId,
        qty,
        unit,
        existing.warehouseId,
        effectiveReason,
      );
    }
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.nx04SoItem.update({
        where: { id: itemId },
        data: {
          ...(dto.locationId !== undefined ? { locationId: dto.locationId.trim() } : {}),
          qty,
          unitPrice: unit,
          lineAmount: this.lineAmount(qty, unit),
          // 偉盟設計檢視 P1-5：實際出貨料號（替代出貨）
          ...(actualPartData !== undefined ? actualPartData : {}),
          ...(dto.remark !== undefined ? { remark: dto.remark?.trim() || null } : {}),
          // F1-E 2026-06-09：改價低於 cost/minPrice 時的理由 patch
          ...(dto.belowMinReason !== undefined
            ? { belowMinReason: dto.belowMinReason?.trim() || null }
            : {}),
          updatedBy: user.sub,
        },
        select: SO_ITEM_SEL,
      });
      await this.recalcSoTotals(tx, soId, new PrismaNs.Decimal(String(head.taxRate)));
      return updated;
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'UPDATE',
      entityTable: 'nx04_so_item',
      entityId: itemId,
      entityCode: head.docNo,
      summary: '修改銷貨明細',
      beforeData: mapSoItemApi(existing) as object,
      afterData: mapSoItemApi(row) as object,
    });
    return mapSoItemApi(row);
  }

  /**
   * 05 補做 C6 2026-06-09：所有 lines fulfillStatus='F' → 自動推 SO header → COMPLETED。
   * 觸發點：Nx06Dn 簽收（signedAt 寫入）後外部呼叫。
   * 冪等：SO 已 COMPLETED / CANCELLED 直接 skip；INVOICED/SHIPPED 可推進、其他狀態保留。
   */
  async maybeCompleteAfterDelivery(tenantId: string, soId: string, actorUserId: string): Promise<boolean> {
    const so = await this.prisma.nx04So.findFirst({
      where: { id: soId, tenantId },
      select: { id: true, docNo: true, status: true },
    });
    if (!so) return false;
    if (so.status === SoStatus.COMPLETED || so.status === SoStatus.CANCELLED) return false;
    if (so.status !== SoStatus.SHIPPED && so.status !== SoStatus.INVOICED) return false;

    const items = await this.prisma.nx04SoItem.findMany({
      where: { soId },
      select: { fulfillStatus: true },
    });
    if (!isAllLinesDelivered(items)) return false;

    assertSoStatusTransition(so.status, SoStatus.COMPLETED);
    await this.prisma.nx04So.update({
      where: { id: soId },
      data: {
        status: SoStatus.COMPLETED,
        completedAt: new Date(),
        updatedBy: actorUserId,
      },
    });
    await this.audit.write({
      tenantId,
      actorUserId,
      moduleCode: 'NX04',
      action: 'UPDATE',
      entityTable: 'nx04_so',
      entityId: soId,
      entityCode: so.docNo,
      summary: '銷貨單自動完成（全部 lines 已送達）',
    });
    return true;
  }

  /**
   * F2 組合套餐 2026-06-09：把套餐套用到 SO（新增 N 條 line、總金額 = bundle.bundlePrice）
   * 各 line 帶 bundleId、單價 = 分攤後（priceA × qty 比例）；line.bundleId 非空 → 引擎跳過。
   */
  async applyBundle(
    user: RequestUser,
    soId: string,
    args: { bundleId: string; warehouseId: string; locationId?: string },
  ) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx04So.findFirst({ where: { id: soId, tenantId }, select: SO_SEL });
    if (!head) throw new NotFoundException('SO not found');
    if (head.cancelledAt) throw new BadRequestException('SO is cancelled');
    this.assertSoItemsEditable(head.status);

    const allocation = await this.bundleService.allocateBundleLines(tenantId, args.bundleId.trim());
    const whId = args.warehouseId.trim();
    const locId = args.locationId?.trim();

    await this.prisma.$transaction(async (tx) => {
      const maxLine = await tx.nx04SoItem.aggregate({ where: { soId }, _max: { lineNo: true } });
      let lineNo = (maxLine._max.lineNo ?? 0);
      for (const ln of allocation.lines) {
        lineNo += 1;
        await this.createSoItemTx(tx, user, soId, lineNo, {
          partId: ln.partId,
          warehouseId: whId,
          locationId: locId,
          qty: Number(ln.qty.toString()),
          unitPriceSnapshot: Number(ln.unitPrice.toString()),
          bundleId: args.bundleId.trim(),
        } as CreateSoItemDto);
      }
      await this.recalcSoTotals(tx, soId, new PrismaNs.Decimal(String(head.taxRate)));
    });

    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'UPDATE',
      entityTable: 'nx04_so',
      entityId: soId,
      entityCode: head.docNo,
      summary: `套用套餐 ${allocation.bundleCode}（${allocation.lines.length} 行、總價 ${allocation.bundlePrice.toString()}）`,
    });
    return {
      bundleId: args.bundleId,
      bundleCode: allocation.bundleCode,
      bundlePrice: allocation.bundlePrice.toString(),
      addedLines: allocation.lines.length,
    };
  }

  /**
   * SO 待調貨行清單（NX04-M2 §A C3）
   * 找 transferSourceType='G' 同行調貨 + transferStatus='P' 待補的 line
   * 給 UI 顯示「這 SO 有 N 行要建 IT-O」+ 觸發建單按鈕
   */
  async listPendingTransferLines(user: RequestUser, soId: string) {
    const tenantId = requireTenantId(user);
    const so = await this.prisma.nx04So.findFirst({
      where: { id: soId, tenantId },
      select: { id: true, docNo: true, customerId: true },
    });
    if (!so) throw new NotFoundException('SO not found');
    const items = await this.prisma.nx04SoItem.findMany({
      where: {
        soId,
        transferSourceType: 'G',
        transferStatus: 'P',
        tiId: null,
      },
      orderBy: { lineNo: 'asc' },
      select: { ...SO_ITEM_SEL, transferSourceType: true, transferStatus: true, tiId: true },
    });
    return { soId: so.id, docNo: so.docNo, customerId: so.customerId, items };
  }

  /**
   * 從 SO 行群組建 Nx02Ti 草稿（NX04-M2 §A C3）
   * - 一張 TI 對應一個 partnerId、不同 partnerId 多次呼叫
   * - 驗證 partnerId 是 O 同行 或 canTransferStock=true
   * - 驗證所有 soItemIds 屬於 SO 且 transferSourceType='G' + transferStatus='P' + tiId 為空
   * - 建 Nx02Ti status='D' draft、taxRate=5、unitCost=0 待同行報價回填
   * - 為每個 soItem 建 Nx02TiItem（sourceSoItemId 必填）
   * - 更新 SO line transferStatus='I'（補貨中）+ tiId 連結
   */
  async createTiFromSoLines(user: RequestUser, soId: string, dto: CreateTiFromSoDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      const so = await tx.nx04So.findFirst({
        where: { id: soId, tenantId },
        select: {
          id: true,
          docNo: true,
          warehouseId: true,
          currencyId: true,
          customerId: true,
          status: true,
          cancelledAt: true,
        },
      });
      if (!so) throw new NotFoundException('SO not found');
      if (so.cancelledAt) throw new BadRequestException('SO is cancelled');

      // 同行驗證
      const partner = await tx.nx01Partner.findFirst({
        where: { id: dto.partnerId.trim(), tenantId, isActive: true },
        select: { id: true, partnerType: true, canTransferStock: true },
      });
      if (!partner) throw new BadRequestException('partnerId not found or inactive');
      if (partner.partnerType !== 'O' && !partner.canTransferStock) {
        throw new BadRequestException("partnerId must be type='O' or canTransferStock=true for IT transfer");
      }

      // 驗 line 都屬於該 SO + 都是 G + P + 未綁 TI
      const itemIds = dto.soItemIds.map((s) => s.trim());
      const items = await tx.nx04SoItem.findMany({
        where: { id: { in: itemIds }, soId },
        select: {
          id: true,
          lineNo: true,
          partId: true,
          partNo: true,
          partName: true,
          qty: true,
          unitPrice: true,
          transferSourceType: true,
          transferStatus: true,
          tiId: true,
        },
      });
      if (items.length !== itemIds.length) {
        throw new BadRequestException('Some soItemIds do not belong to this SO');
      }
      for (const it of items) {
        if (it.transferSourceType !== 'G') {
          throw new BadRequestException(`SO line ${it.lineNo} is not transferSourceType=G`);
        }
        if (it.transferStatus !== 'P') {
          throw new BadRequestException(`SO line ${it.lineNo} transferStatus is not P (already in progress or done)`);
        }
        if (it.tiId) {
          throw new BadRequestException(`SO line ${it.lineNo} already linked to TI ${it.tiId}`);
        }
      }

      // 建 Ti header
      const wh = await tx.nx01Warehouse.findFirst({
        where: { id: so.warehouseId, tenantId },
        select: { code: true },
      });
      if (!wh) throw new BadRequestException('SO warehouse invalid');
      const tiDocNo = await allocNx02DocNo(tx, tenantId, 'TI', wh.code);
      const taxRate = new PrismaNs.Decimal('5.00');

      // subtotal 先建 0、明細帶入同行報價後於迴圈末重算（NX04 紀錄表 B3）。
      // 業務上 SO unitPrice 是賣價、不是進貨成本、TI unitCost 不能直接 = SO.unitPrice；成本改取自詢價紀錄。
      const subtotal = new PrismaNs.Decimal(0);
      const taxAmount = new PrismaNs.Decimal(0);
      const totalAmount = new PrismaNs.Decimal(0);

      const ti = await tx.nx02Ti.create({
        data: {
          tenantId,
          warehouseId: so.warehouseId,
          docNo: tiDocNo,
          tiDate: new Date(),
          partnerId: partner.id,
          currencyId: so.currencyId,
          status: 'D',
          subtotal,
          taxRate,
          taxAmount,
          totalAmount,
          remark: dto.remark?.trim() || `From SO ${so.docNo}`,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: { id: true, docNo: true },
      });

      // 同行報價：從詢價紀錄帶入（這個同行 × 這顆料、取最近一筆）填 unitCost（NX04 紀錄表 B3）
      const inqRecs = await tx.nx04InquiryRecord.findMany({
        where: { tenantId, sourcePartnerId: partner.id, partId: { in: items.map((i) => i.partId) } },
        orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
        select: { id: true, partId: true, unitPrice: true },
      });
      const inqByPart = new Map<string, { id: string; unitPrice: PrismaNs.Decimal }>();
      for (const q of inqRecs) if (!inqByPart.has(q.partId)) inqByPart.set(q.partId, { id: q.id, unitPrice: q.unitPrice });

      // 建 TiItem + 更新 SO line
      let line = 1;
      let sub = new PrismaNs.Decimal(0);
      for (const it of items) {
        const inq = inqByPart.get(it.partId);
        const unitCost = inq ? new PrismaNs.Decimal(inq.unitPrice) : new PrismaNs.Decimal(0);
        const qtyD = new PrismaNs.Decimal(String(it.qty));
        const lineAmt = qtyD.mul(unitCost).toDecimalPlaces(2);
        sub = sub.add(lineAmt);
        await tx.nx02TiItem.create({
          data: {
            tiId: ti.id,
            lineNo: line++,
            partId: it.partId,
            partNo: it.partNo,
            partName: it.partName,
            qty: qtyD,
            unitCost,
            lineAmount: lineAmt,
            sourceSoItemId: it.id,
            sourceInquiryRecordId: inq?.id ?? null,
            createdBy: user.sub,
            updatedBy: user.sub,
          },
        });
        await tx.nx04SoItem.update({
          where: { id: it.id },
          data: {
            tiId: ti.id,
            transferStatus: 'I',
            updatedBy: user.sub,
          },
        });
      }

      // 更新 TI 表頭金額（帶入同行報價後重算 subtotal/tax/total）
      const tiTax = sub.mul(taxRate).div(100).toDecimalPlaces(2);
      await tx.nx02Ti.update({
        where: { id: ti.id },
        data: { subtotal: sub, taxAmount: tiTax, totalAmount: sub.add(tiTax) },
      });

      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX04',
        action: 'CREATE',
        entityTable: 'nx02_ti',
        entityId: ti.id,
        entityCode: ti.docNo,
        summary: `從 SO ${so.docNo} 觸發同行調貨 IT-O（${items.length} 行 → ${partner.id}）`,
        afterData: { tiId: ti.id, tiDocNo: ti.docNo, soId: so.id, soDocNo: so.docNo, partnerId: partner.id, lineCount: items.length } as object,
      });

      return {
        tiId: ti.id,
        tiDocNo: ti.docNo,
        soId: so.id,
        soDocNo: so.docNo,
        partnerId: partner.id,
        lineCount: items.length,
      };
    });
  }

  async removeItem(user: RequestUser, soId: string, itemId: string) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx04So.findFirst({ where: { id: soId, tenantId }, select: SO_SEL });
    if (!head) throw new NotFoundException('SO not found');
    if (head.cancelledAt) throw new BadRequestException('SO is cancelled');
    this.assertSoItemsEditable(head.status);
    const existing = await this.prisma.nx04SoItem.findFirst({ where: { id: itemId, soId }, select: SO_ITEM_SEL });
    if (!existing) throw new NotFoundException('SO item not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.nx04SoItem.delete({ where: { id: itemId } });
      await this.recalcSoTotals(tx, soId, new PrismaNs.Decimal(String(head.taxRate)));
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'DELETE',
      entityTable: 'nx04_so_item',
      entityId: itemId,
      entityCode: head.docNo,
      summary: '刪除銷貨明細',
      beforeData: mapSoItemApi(existing) as object,
    });
    return { ok: true };
  }
}

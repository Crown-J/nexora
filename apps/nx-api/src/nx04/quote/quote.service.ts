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
import { allocNx04DocNo } from '../../shared/nx04/nx04-doc-no';
import { assertQuoteStatusTransition, QuoteStatus } from '../../shared/nx04/nx04-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import type {
  CreateQuoteDto,
  CreateQuoteItemDto,
  PatchQuoteItemDto,
  QuoteListQueryDto,
  UpdateQuoteDto,
} from './dto/quote.dto';

const Q_SEL = {
  id: true,
  tenantId: true,
  docNo: true,
  warehouseId: true,
  quoteDate: true,
  customerId: true,
  customerGradeId: true,
  salesPersonId: true,
  customerRefNo: true,
  validUntil: true,
  currencyId: true,
  subtotal: true,
  taxRate: true,
  taxAmount: true,
  totalAmount: true,
  status: true,
  source: true,
  remark: true,
  voidedAt: true,
  voidedBy: true,
  voidReason: true,
  rfqId: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

const Q_ITEM_SEL = {
  id: true,
  quoteId: true,
  lineNo: true,
  groupNo: true,
  partId: true,
  partNo: true,
  partName: true,
  qty: true,
  unitPrice: true,
  minPrice: true,
  discountCodeId: true,
  lineAmount: true,
  isSelected: true,
  belowMinReason: true,
  transferredQty: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  // 明細顯示：基準料號(code)/廠牌料號(secCode)/品名(name)/廠牌(brand.name) 由零件帶
  part: { select: { code: true, secCode: true, name: true, brand: { select: { name: true } } } },
} as const;

// 表頭關聯 select：客戶 / 客戶等級 / 倉庫 / 業務員 名稱（避免畫面露內碼）
const Q_REL_SEL = {
  customer: { select: { code: true, name: true } },
  customerGrade: { select: { code: true, name: true } },
  warehouse: { select: { code: true, name: true } },
  salesPerson: { select: { userName: true } },
  currency: { select: { code: true } },
} as const;

// 把關聯物件攤平成 xxxName / xxxCode 欄位，移除巢狀關聯物件
function flattenQuoteRels(row: Record<string, unknown>) {
  const customer = row.customer as { code?: string; name?: string } | null | undefined;
  const customerGrade = row.customerGrade as { code?: string; name?: string } | null | undefined;
  const warehouse = row.warehouse as { code?: string; name?: string } | null | undefined;
  const salesPerson = row.salesPerson as { userName?: string } | null | undefined;
  const currency = row.currency as { code?: string } | null | undefined;
  const {
    customer: _c,
    customerGrade: _g,
    warehouse: _w,
    salesPerson: _s,
    currency: _cur,
    ...rest
  } = row;
  return {
    ...rest,
    customerCode: customer?.code ?? null,
    customerName: customer?.name ?? null,
    customerGradeName: customerGrade?.name ?? null,
    warehouseCode: warehouse?.code ?? null,
    warehouseName: warehouse?.name ?? null,
    salesPersonName: salesPerson?.userName ?? null,
    currencyCode: currency?.code ?? null,
  };
}

function mapQuoteItemApi(row: Record<string, unknown>) {
  const u = row.unitPrice as PrismaNs.Decimal;
  const part = row.part as
    | { code?: string; secCode?: string; name?: string; brand?: { name?: string } | null }
    | null
    | undefined;
  const { part: _p, ...rest } = row;
  return {
    ...rest,
    unitPriceSnapshot: u,
    baseNo: part?.code ?? null,
    brandNo: part?.secCode ?? null,
    brandName: part?.brand?.name ?? null,
  };
}

@Injectable()
export class QuoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  /**
   * Quote 列表 query
   * NX04-IMPL-01 Phase 3 commit 3b：對齊 Crown Q9 純記錄 + 多業務員共享
   *   - tenant-wide 列表（不按 createdBy 過濾、業務員 A 可看業務員 B 的報價歷史）
   *   - 純記錄 / 不簽核（既有 status DRAFT→SENT→ACCEPTED 業務員自行標、無系統強制簽核）
   *   - search 擴：docNo / remark / customer.code/name / 任一 item.partNo/partName
   */
  private whereList(tenantId: string, q: QuoteListQueryDto): Prisma.Nx04QuoteWhereInput {
    // 注意：不再寫死 voidedAt:null（作廢單要能查/顯示，由 validity 篩選）
    const and: Prisma.Nx04QuoteWhereInput[] = [];
    const todayStart = new Date(new Date().toDateString());

    // 來源（正式 FORMAL / 即時 INSTANT）；報價單列表預設只看正式，即時報價紀錄另外看
    if (q.source === 'FORMAL' || q.source === 'INSTANT') and.push({ source: q.source });

    // 狀態（純有效期：有效 / 失效(逾期) / 作廢）
    if (q.validity === 'void') and.push({ voidedAt: { not: null } });
    else if (q.validity === 'expired') and.push({ voidedAt: null, validUntil: { lt: todayStart } });
    else if (q.validity === 'valid')
      and.push({ voidedAt: null, OR: [{ validUntil: null }, { validUntil: { gte: todayStart } }] });

    // 單號區間（只填起 = 該單號單一比對）
    const dnFrom = q.docNoFrom?.trim();
    const dnTo = q.docNoTo?.trim();
    if (dnFrom && dnTo) and.push({ docNo: { gte: dnFrom, lte: dnTo } });
    else if (dnFrom) and.push({ docNo: dnFrom });
    else if (dnTo) and.push({ docNo: { lte: dnTo } });

    // 日期區間（只填起 = 該日當天）
    const dateRange = (from?: string, to?: string) => {
      const f = from?.trim();
      const t = to?.trim();
      if (!f && !t) return undefined;
      const cond: { gte?: Date; lte?: Date } = {};
      if (f) cond.gte = new Date(`${f}T00:00:00`);
      cond.lte = new Date(`${(t || f)!}T23:59:59.999`);
      return cond;
    };
    const cr = dateRange(q.createdFrom, q.createdTo);
    if (cr) and.push({ createdAt: cr });
    const qr = dateRange(q.quoteFrom, q.quoteTo);
    if (qr) and.push({ quoteDate: qr });

    // 客戶編號 / 名稱 / 料號
    if (q.customerCode?.trim())
      and.push({ customer: { code: { contains: q.customerCode.trim(), mode: 'insensitive' } } });
    if (q.customerName?.trim())
      and.push({ customer: { name: { contains: q.customerName.trim(), mode: 'insensitive' } } });
    if (q.partNo?.trim())
      and.push({
        rev_Nx04QuoteItem_quoteId: { some: { partNo: { contains: q.partNo.trim(), mode: 'insensitive' } } },
      });

    // 舊泛用 search（單號/備註/客戶/料件、向後相容）
    if (q.search?.trim()) {
      const s = q.search.trim();
      and.push({
        OR: [
          { docNo: { contains: s, mode: 'insensitive' } },
          { remark: { contains: s, mode: 'insensitive' } },
          { customer: { code: { contains: s, mode: 'insensitive' } } },
          { customer: { name: { contains: s, mode: 'insensitive' } } },
          { rev_Nx04QuoteItem_quoteId: { some: { partNo: { contains: s, mode: 'insensitive' } } } },
          { rev_Nx04QuoteItem_quoteId: { some: { partName: { contains: s, mode: 'insensitive' } } } },
        ],
      });
    }

    const where: Prisma.Nx04QuoteWhereInput = { tenantId };
    if (and.length) where.AND = and;
    return where;
  }

  /** 建單人員查詢 → 解析成 user id 清單（員編 userAccount 或 姓名 userName 模糊比對）*/
  private async resolveCreatorIds(tenantId: string, creator?: string): Promise<string[] | null> {
    const c = creator?.trim();
    if (!c) return null;
    const us = await this.prisma.nx01User.findMany({
      where: {
        tenantId,
        OR: [
          { userName: { contains: c, mode: 'insensitive' } },
          { userAccount: { contains: c, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
    return us.map((u) => u.id);
  }

  private async assertCustomerC(tx: Prisma.TransactionClient, tenantId: string, partnerId: string) {
    const p = await tx.nx01Partner.findFirst({
      where: { id: partnerId, tenantId, isActive: true, partnerType: { in: ['C', 'O'] } },
      select: { id: true },
    });
    if (!p) throw new BadRequestException("customerId must be an active partner with partnerType IN ('C', 'O')");
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

  /**
   * 計算最低售價（NX04-M2 §A C1 毛利警告基準）
   * minPrice = avgCost × (1 + marginPct/100)
   * 沒有 customerGradeId → 不警告（return null）
   * 沒有 stock_balance 或 avgCost=0 → 不警告（料件還沒進過貨）
   */
  private async computeMinPrice(
    tx: Prisma.TransactionClient,
    tenantId: string,
    partId: string,
    warehouseId: string,
    customerGradeId: string | null,
  ): Promise<PrismaNs.Decimal | null> {
    if (!customerGradeId) return null;
    const grade = await tx.nx01CustomerGrade.findFirst({
      where: { id: customerGradeId, tenantId },
      select: { marginPct: true },
    });
    if (!grade) return null;
    const bal = await tx.nx03StockBalance.findFirst({
      where: { tenantId, partId, warehouseId },
      select: { avgCost: true },
    });
    if (!bal) return null;
    const avgCost = new PrismaNs.Decimal(bal.avgCost);
    if (avgCost.lte(0)) return null;
    const marginPct = new PrismaNs.Decimal(grade.marginPct);
    return avgCost.mul(marginPct.div(100).add(1)).toDecimalPlaces(4);
  }

  /**
   * 毛利警告驗證（NX04-M2 §A C1）
   * unitPrice < minPrice → require belowMinReason
   * 不擋業務、只強制填理由
   */
  private assertMinPriceReason(
    unitPrice: PrismaNs.Decimal,
    minPrice: PrismaNs.Decimal | null,
    belowMinReason: string | null | undefined,
  ): void {
    if (!minPrice) return;
    if (unitPrice.gte(minPrice)) return;
    if (!belowMinReason?.trim()) {
      throw new BadRequestException(
        `unitPrice (${unitPrice.toString()}) below minPrice (${minPrice.toString()}); belowMinReason required`,
      );
    }
  }

  private async recalcQuoteTotals(tx: Prisma.TransactionClient, quoteId: string, taxRate: PrismaNs.Decimal) {
    const items = await tx.nx04QuoteItem.findMany({
      where: { quoteId, isSelected: true },
      select: { lineAmount: true },
    });
    let sub = new PrismaNs.Decimal(0);
    for (const it of items) sub = sub.add(it.lineAmount);
    const tax = sub.mul(taxRate).div(100).toDecimalPlaces(2);
    const total = sub.add(tax);
    await tx.nx04Quote.update({
      where: { id: quoteId },
      data: { subtotal: sub, taxAmount: tax, totalAmount: total },
    });
  }

  private assertQuoteItemsEditable(status: string) {
    if (status !== QuoteStatus.DRAFT && status !== QuoteStatus.SENT) {
      throw new BadRequestException('Quote line items are not editable in current status');
    }
  }

  private mapDetail(row: { rev_Nx04QuoteItem_quoteId: unknown[] } & Record<string, unknown>) {
    const { rev_Nx04QuoteItem_quoteId: items, ...rest } = row;
    return {
      ...flattenQuoteRels(rest),
      items: (items as object[]).map((it) => mapQuoteItemApi(it as never)),
    };
  }

  async list(user: RequestUser, q: QuoteListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where = this.whereList(tenantId, q);
    // 建單人員查詢：解析 user id 後加進條件（無相符 → 強制空結果）
    const creatorFilterIds = await this.resolveCreatorIds(tenantId, q.creator);
    if (creatorFilterIds !== null) {
      const andArr = (where.AND as Prisma.Nx04QuoteWhereInput[] | undefined) ?? [];
      andArr.push({ createdBy: { in: creatorFilterIds.length ? creatorFilterIds : ['__no_match__'] } });
      where.AND = andArr;
    }
    const [total, rows] = await Promise.all([
      this.prisma.nx04Quote.count({ where }),
      this.prisma.nx04Quote.findMany({
        where,
        orderBy: { docNo: 'desc' }, // 預設單號大到小（最新在最上）
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          ...Q_SEL,
          ...Q_REL_SEL,
          _count: { select: { rev_Nx04QuoteItem_quoteId: true } },
        },
      }),
    ]);
    // 建單人員姓名批次解析（createdBy 為 user id、Nx04Quote 無 FK 關聯）
    const creatorIds = [...new Set(rows.map((r) => r.createdBy).filter(Boolean))];
    const creators = creatorIds.length
      ? await this.prisma.nx01User.findMany({
          where: { id: { in: creatorIds } },
          select: { id: true, userName: true },
        })
      : [];
    const creatorMap = new Map(creators.map((u) => [u.id, u.userName]));
    const items = rows.map((r) => {
      const flat = flattenQuoteRels(r as Record<string, unknown>) as Record<string, unknown>;
      const count =
        (r as { _count?: { rev_Nx04QuoteItem_quoteId?: number } })._count
          ?.rev_Nx04QuoteItem_quoteId ?? 0;
      delete flat._count;
      return {
        ...flat,
        itemCount: count,
        createdByName: creatorMap.get(r.createdBy) ?? null,
      };
    });
    return { page, pageSize, total, items };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx04Quote.findFirst({
      where: { id, tenantId },
      select: {
        ...Q_SEL,
        ...Q_REL_SEL,
        rev_Nx04QuoteItem_quoteId: { orderBy: { lineNo: 'asc' }, select: Q_ITEM_SEL },
      },
    });
    if (!row) throw new NotFoundException('Quote not found');
    const mapped = this.mapDetail(row as never) as Record<string, unknown>;
    // 建單人員姓名（createdBy 為 user id、無 FK 關聯）
    const creator = row.createdBy
      ? await this.prisma.nx01User.findFirst({ where: { id: row.createdBy }, select: { userName: true } })
      : null;
    return { ...mapped, createdByName: creator?.userName ?? null };
  }

  /**
   * 是否有「延長報價有效期」權限（鏡像 PermissionService.listMine 最小邏輯，避免 module 循環依賴）。
   * 權限等級 S / 職務 SYSADMIN・OWNER 全通；否則查職務是否被授予 sale.quote.extend-validity。
   */
  private async userCanExtendValidity(user: RequestUser): Promise<boolean> {
    if (String(user.permissionLevelCode ?? '').trim().toUpperCase() === 'S') return true;
    const userRoles = await this.prisma.nx01UserRole.findMany({
      where: { userId: user.sub, isActive: true },
      include: { role: { select: { id: true, code: true, isActive: true } } },
    });
    const activeRoles = userRoles.filter((r) => r.role.isActive);
    const SUPER = new Set(['SYSADMIN', 'OWNER']);
    if (activeRoles.some((r) => SUPER.has(String(r.role.code).trim().toUpperCase()))) return true;
    const roleIds = activeRoles.map((r) => r.role.id);
    if (!roleIds.length) return false;
    const grant = await this.prisma.nx01RolePermission.findFirst({
      where: {
        roleId: { in: roleIds },
        permission: { code: 'sale.quote.extend-validity', isActive: true },
      },
      select: { id: true },
    });
    return !!grant;
  }

  /**
   * 計算 + 驗證報價有效期（甲案卡控、執行長 2026-06-29 拍板）。
   * 建單未填 → 自動帶 quoteDate + 租戶預設天數（quoteDefaultValidityDays、預設 30）。
   * 業務員只能縮短不能延長：填的日期若超過「預設上限」、需 sale.quote.extend-validity 權限。
   */
  private async resolveCreateValidUntil(
    tx: Prisma.TransactionClient,
    tenantId: string,
    quoteDate: Date,
    provided: string | undefined,
    canExtend: boolean,
  ): Promise<Date> {
    const tenant = await tx.nx99Tenant.findFirst({
      where: { id: tenantId },
      select: { quoteDefaultValidityDays: true },
    });
    const days = tenant?.quoteDefaultValidityDays ?? 30;
    const cap = new Date(quoteDate);
    cap.setDate(cap.getDate() + days);
    if (!provided) return cap;
    const wanted = new Date(provided);
    if (wanted.getTime() > cap.getTime() && !canExtend) {
      throw new BadRequestException(
        `報價有效期最長至 ${cap.toISOString().slice(0, 10)}（預設 ${days} 天）；延長需銷售組長以上權限`,
      );
    }
    return wanted;
  }

  /** 建單倉庫：指定優先 → 客戶預設取貨倉 → 使用者隸屬倉(user_warehouse isPrimary) → 租戶主倉(isMain) → 任一倉 */
  private async resolveCreateWarehouse(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
    provided?: string,
    customerDefaultWhId?: string,
  ): Promise<{ id: string; code: string }> {
    if (provided?.trim()) {
      const w = await tx.nx01Warehouse.findFirst({
        where: { id: provided.trim(), tenantId },
        select: { id: true, code: true },
      });
      if (!w) throw new BadRequestException('warehouseId invalid');
      return w;
    }
    // 客戶預設取貨倉（業界 muscle memory：客戶習慣取貨倉、建單自動帶）
    if (customerDefaultWhId?.trim()) {
      const w = await tx.nx01Warehouse.findFirst({
        where: { id: customerDefaultWhId.trim(), tenantId, isActive: true },
        select: { id: true, code: true },
      });
      if (w) return w;
    }
    const uw = await tx.nx01UserWarehouse.findFirst({
      where: { userId, tenantId },
      orderBy: { isPrimary: 'desc' },
      select: { warehouseId: true },
    });
    if (uw) {
      const w = await tx.nx01Warehouse.findFirst({
        where: { id: uw.warehouseId, tenantId, isActive: true },
        select: { id: true, code: true },
      });
      if (w) return w;
    }
    const main = await tx.nx01Warehouse.findFirst({
      where: { tenantId, isActive: true },
      orderBy: [{ isMain: 'desc' }, { code: 'asc' }],
      select: { id: true, code: true },
    });
    if (!main) throw new BadRequestException('找不到可用倉庫，請先建立倉庫');
    return main;
  }

  async create(user: RequestUser, dto: CreateQuoteDto) {
    const tenantId = requireTenantId(user);
    return this.prisma.$transaction(async (tx) => {
      await this.assertCustomerC(tx, tenantId, dto.customerId.trim());
      const cust = await tx.nx01Partner.findFirst({
        where: { id: dto.customerId.trim(), tenantId },
        select: { defaultWarehouseId: true },
      });
      const wh = await this.resolveCreateWarehouse(
        tx,
        tenantId,
        user.sub,
        dto.warehouseId,
        cust?.defaultWarehouseId ?? undefined,
      );
      const currencyId = await resolveCurrencyId(tx, dto.currencyId);
      const taxRate = new PrismaNs.Decimal(dto.taxRate);
      const docNo = await allocNx04DocNo(tx, tenantId, 'QT', wh.code);
      const quoteDate = new Date(dto.quoteDate);
      const validUntil = await this.resolveCreateValidUntil(
        tx,
        tenantId,
        quoteDate,
        dto.validUntil,
        await this.userCanExtendValidity(user),
      );
      const quote = await tx.nx04Quote.create({
        data: {
          tenantId,
          docNo,
          warehouseId: wh.id,
          quoteDate,
          customerId: dto.customerId.trim(),
          customerGradeId: dto.customerGradeId?.trim() || null,
          salesPersonId: dto.salesPersonId?.trim() || user.sub,
          customerRefNo: dto.customerRefNo?.trim() || null,
          source: dto.source?.trim() === 'INSTANT' ? 'INSTANT' : 'FORMAL',
          validUntil,
          currencyId,
          taxRate,
          subtotal: 0,
          taxAmount: 0,
          totalAmount: 0,
          status: QuoteStatus.DRAFT,
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: Q_SEL,
      });
      let line = 1;
      if (dto.items?.length) {
        for (const it of dto.items) {
          const snap = await this.loadPartSnapshot(tx, tenantId, it.partId.trim());
          const qty = new PrismaNs.Decimal(it.qty);
          const unit = new PrismaNs.Decimal(it.unitPriceSnapshot);
          const sel = it.isSelected !== false;
          const minPrice = await this.computeMinPrice(
            tx,
            tenantId,
            it.partId.trim(),
            wh.id,
            dto.customerGradeId?.trim() || null,
          );
          this.assertMinPriceReason(unit, minPrice, it.belowMinReason);
          await tx.nx04QuoteItem.create({
            data: {
              quoteId: quote.id,
              lineNo: line++,
              partId: it.partId.trim(),
              partNo: snap.partNo,
              partName: snap.partName,
              qty,
              unitPrice: unit,
              minPrice: minPrice ?? null,
              belowMinReason: it.belowMinReason?.trim() || null,
              lineAmount: sel ? this.lineAmount(qty, unit) : new PrismaNs.Decimal(0),
              isSelected: sel,
              remark: it.remark?.trim() || null,
              createdBy: user.sub,
              updatedBy: user.sub,
            },
          });
        }
      }
      await this.recalcQuoteTotals(tx, quote.id, taxRate);
      const full = await tx.nx04Quote.findFirst({
        where: { id: quote.id },
        select: {
          ...Q_SEL,
          ...Q_REL_SEL,
          rev_Nx04QuoteItem_quoteId: { orderBy: { lineNo: 'asc' }, select: Q_ITEM_SEL },
        },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX04',
        action: 'CREATE',
        entityTable: 'nx04_quote',
        entityId: quote.id,
        entityCode: quote.docNo,
        summary: '建立報價單',
        afterData: full as object,
      });
      return this.mapDetail(full as never);
    });
  }

  async update(user: RequestUser, id: string, dto: UpdateQuoteDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx04Quote.findFirst({ where: { id, tenantId }, select: Q_SEL });
    if (!existing) throw new NotFoundException('Quote not found');
    if (existing.voidedAt) throw new BadRequestException('Quote is voided');

    if (dto.warehouseId !== undefined && dto.warehouseId.trim()) {
      const w = await this.prisma.nx01Warehouse.findFirst({
        where: { id: dto.warehouseId.trim(), tenantId },
        select: { id: true },
      });
      if (!w) throw new BadRequestException('warehouseId invalid');
    }

    if (dto.status !== undefined && dto.status !== existing.status) {
      assertQuoteStatusTransition(existing.status, dto.status);
    }

    // 有效期甲案卡控：只能縮短不能延長（延長＝比原本更晚或改為無限期），延長需銷售組長以上權限
    if (dto.validUntil !== undefined) {
      const oldVu = existing.validUntil ? new Date(existing.validUntil) : null;
      const newVu = dto.validUntil ? new Date(dto.validUntil) : null;
      const isExtending = oldVu !== null && (newVu === null || newVu.getTime() > oldVu.getTime());
      if (isExtending && !(await this.userCanExtendValidity(user))) {
        throw new BadRequestException('延長報價有效期需銷售組長以上權限');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const taxRate = new PrismaNs.Decimal(existing.taxRate);
      await tx.nx04Quote.update({
        where: { id },
        data: {
          ...(dto.quoteDate !== undefined ? { quoteDate: new Date(dto.quoteDate) } : {}),
          ...(dto.validUntil !== undefined ? { validUntil: dto.validUntil ? new Date(dto.validUntil) : null } : {}),
          ...(dto.salesPersonId !== undefined ? { salesPersonId: dto.salesPersonId?.trim() || null } : {}),
          ...(dto.customerRefNo !== undefined ? { customerRefNo: dto.customerRefNo?.trim() || null } : {}),
          ...(dto.warehouseId !== undefined && dto.warehouseId.trim() ? { warehouseId: dto.warehouseId.trim() } : {}),
          ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          updatedBy: user.sub,
        },
      });
      if (dto.status !== undefined || dto.quoteDate !== undefined) {
        await this.recalcQuoteTotals(tx, id, taxRate);
      }
      const full = await tx.nx04Quote.findFirst({
        where: { id },
        select: {
          ...Q_SEL,
          ...Q_REL_SEL,
          rev_Nx04QuoteItem_quoteId: { orderBy: { lineNo: 'asc' }, select: Q_ITEM_SEL },
        },
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX04',
        action: 'UPDATE',
        entityTable: 'nx04_quote',
        entityId: id,
        entityCode: existing.docNo,
        summary: '修改報價單',
        beforeData: existing as object,
        afterData: full as object,
      });
      return this.mapDetail(full as never);
    });
  }

  async softDelete(user: RequestUser, id: string, voidReason?: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx04Quote.findFirst({ where: { id, tenantId }, select: Q_SEL });
    if (!existing) throw new NotFoundException('Quote not found');
    if (existing.voidedAt) throw new BadRequestException('Quote already voided');
    assertQuoteStatusTransition(existing.status, QuoteStatus.CANCELLED);
    await this.prisma.nx04Quote.update({
      where: { id },
      data: {
        voidedAt: new Date(),
        voidedBy: user.sub,
        voidReason: voidReason?.trim() || 'VOID',
        status: QuoteStatus.CANCELLED,
        updatedBy: user.sub,
      },
    });
    const full = await this.prisma.nx04Quote.findFirst({
      where: { id },
      select: {
        ...Q_SEL,
        ...Q_REL_SEL,
        rev_Nx04QuoteItem_quoteId: { orderBy: { lineNo: 'asc' }, select: Q_ITEM_SEL },
      },
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'DELETE',
      entityTable: 'nx04_quote',
      entityId: id,
      entityCode: existing.docNo,
      summary: '作廢報價單',
      beforeData: existing as object,
      afterData: full as object,
    });
    return this.mapDetail(full as never);
  }

  async addItem(user: RequestUser, quoteId: string, dto: CreateQuoteItemDto) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx04Quote.findFirst({ where: { id: quoteId, tenantId }, select: Q_SEL });
    if (!head) throw new NotFoundException('Quote not found');
    if (head.voidedAt) throw new BadRequestException('Quote is voided');
    this.assertQuoteItemsEditable(head.status);
    const snap = await this.loadPartSnapshot(this.prisma, tenantId, dto.partId.trim());
    const maxLine = await this.prisma.nx04QuoteItem.aggregate({ where: { quoteId }, _max: { lineNo: true } });
    const lineNo = (maxLine._max.lineNo ?? 0) + 1;
    const qty = new PrismaNs.Decimal(dto.qty);
    const unit = new PrismaNs.Decimal(dto.unitPriceSnapshot);
    const sel = dto.isSelected !== false;
    const minPrice = await this.computeMinPrice(
      this.prisma,
      tenantId,
      dto.partId.trim(),
      head.warehouseId,
      head.customerGradeId,
    );
    this.assertMinPriceReason(unit, minPrice, dto.belowMinReason);
    const row = await this.prisma.nx04QuoteItem.create({
      data: {
        quoteId,
        lineNo,
        partId: dto.partId.trim(),
        partNo: snap.partNo,
        partName: snap.partName,
        qty,
        unitPrice: unit,
        minPrice: minPrice ?? null,
        belowMinReason: dto.belowMinReason?.trim() || null,
        lineAmount: sel ? this.lineAmount(qty, unit) : new PrismaNs.Decimal(0),
        isSelected: sel,
        remark: dto.remark?.trim() || null,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: Q_ITEM_SEL,
    });
    await this.recalcQuoteTotals(this.prisma, quoteId, new PrismaNs.Decimal(head.taxRate));
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'CREATE',
      entityTable: 'nx04_quote_item',
      entityId: row.id,
      entityCode: head.docNo,
      summary: '新增報價明細',
      afterData: mapQuoteItemApi(row) as object,
    });
    return mapQuoteItemApi(row);
  }

  async patchItem(user: RequestUser, quoteId: string, itemId: string, dto: PatchQuoteItemDto) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx04Quote.findFirst({ where: { id: quoteId, tenantId }, select: Q_SEL });
    if (!head) throw new NotFoundException('Quote not found');
    if (head.voidedAt) throw new BadRequestException('Quote is voided');
    this.assertQuoteItemsEditable(head.status);
    const existing = await this.prisma.nx04QuoteItem.findFirst({ where: { id: itemId, quoteId }, select: Q_ITEM_SEL });
    if (!existing) throw new NotFoundException('Quote item not found');
    const qty = dto.qty !== undefined ? new PrismaNs.Decimal(dto.qty) : new PrismaNs.Decimal(existing.qty);
    const unit =
      dto.unitPriceSnapshot !== undefined
        ? new PrismaNs.Decimal(dto.unitPriceSnapshot)
        : new PrismaNs.Decimal(existing.unitPrice);
    const sel = dto.isSelected !== undefined ? dto.isSelected : existing.isSelected;
    const lineAmount = sel ? this.lineAmount(qty, unit) : new PrismaNs.Decimal(0);
    const minPrice =
      dto.unitPriceSnapshot !== undefined
        ? await this.computeMinPrice(this.prisma, tenantId, existing.partId, head.warehouseId, head.customerGradeId)
        : existing.minPrice
        ? new PrismaNs.Decimal(existing.minPrice)
        : null;
    const effectiveBelowMinReason = dto.belowMinReason ?? existing.belowMinReason ?? undefined;
    if (dto.unitPriceSnapshot !== undefined) {
      this.assertMinPriceReason(unit, minPrice, effectiveBelowMinReason);
    }
    const row = await this.prisma.nx04QuoteItem.update({
      where: { id: itemId },
      data: {
        qty,
        unitPrice: unit,
        lineAmount,
        ...(dto.unitPriceSnapshot !== undefined ? { minPrice } : {}),
        ...(dto.belowMinReason !== undefined ? { belowMinReason: dto.belowMinReason?.trim() || null } : {}),
        ...(dto.isSelected !== undefined ? { isSelected: dto.isSelected } : {}),
        ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
        updatedBy: user.sub,
      },
      select: Q_ITEM_SEL,
    });
    await this.recalcQuoteTotals(this.prisma, quoteId, new PrismaNs.Decimal(head.taxRate));
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'UPDATE',
      entityTable: 'nx04_quote_item',
      entityId: itemId,
      entityCode: head.docNo,
      summary: '修改報價明細',
      beforeData: mapQuoteItemApi(existing) as object,
      afterData: mapQuoteItemApi(row) as object,
    });
    return mapQuoteItemApi(row);
  }

  /**
   * 歷史價查詢（NX04-M2 §A C1）
   * 給 UI 加料件行時顯示「該客戶上次報過 / 買過此料件的價格 + 時間」
   * 範圍：同 tenantId + customerId + partId + quote 未作廢 + 不限 status
   * 回傳：最近 limit 筆（預設 5）
   */
  async getHistoricalPrices(
    user: RequestUser,
    customerId: string,
    partId: string,
    limit?: number,
  ) {
    const tenantId = requireTenantId(user);
    const take = Math.min(Math.max(limit ?? 5, 1), 20);
    const rows = await this.prisma.nx04QuoteItem.findMany({
      where: {
        partId,
        quote: { tenantId, customerId, voidedAt: null },
      },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        unitPrice: true,
        qty: true,
        minPrice: true,
        belowMinReason: true,
        createdAt: true,
        quote: {
          select: { id: true, docNo: true, quoteDate: true, status: true },
        },
      },
    });
    return rows.map((r) => ({
      quoteItemId: r.id,
      quoteId: r.quote.id,
      docNo: r.quote.docNo,
      quoteDate: r.quote.quoteDate,
      status: r.quote.status,
      unitPrice: r.unitPrice,
      qty: r.qty,
      minPrice: r.minPrice,
      belowMinReason: r.belowMinReason,
      createdAt: r.createdAt,
    }));
  }

  /**
   * 報價比價面板（5 格）：給 客戶 + 料號 →
   *   ① 建議售價：進價 ×(1+客戶等級毛利率)（成本中心暫緩期暫用算法，= 該等級地板）
   *   ② 同客戶最近報價 ③ 同客戶最近成交 ④ 同級距他客最近報價 ⑤ 同級距他客最近成交
   *   ②~⑤ 皆「近一個月」內才回（逾期回 null）；報價/成交分開；④⑤「同級距」= 同客戶等級。
   */
  async getPriceIntel(user: RequestUser, customerId: string, partId: string) {
    const tenantId = requireTenantId(user);
    const pid = partId.trim();
    const customer = await this.prisma.nx01Partner.findFirst({
      where: { id: customerId.trim(), tenantId },
      select: { id: true, customerGradeId: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    const gradeId = customer.customerGradeId;

    // ① 建議售價（暫用：進價 ×(1+等級毛利率)）
    let suggestedPrice: string | null = null;
    if (gradeId) {
      const [grade, part] = await Promise.all([
        this.prisma.nx01CustomerGrade.findFirst({ where: { id: gradeId, tenantId }, select: { marginPct: true } }),
        this.prisma.nx01Part.findFirst({ where: { id: pid, tenantId }, select: { cost: true } }),
      ]);
      if (grade && part?.cost && new PrismaNs.Decimal(part.cost).gt(0)) {
        const m = new PrismaNs.Decimal(grade.marginPct);
        suggestedPrice = new PrismaNs.Decimal(part.cost).mul(m.div(100).add(1)).toDecimalPlaces(2).toString();
      }
    }

    // 一個月前（②~⑤ 的時間閘）
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 1);

    // 報價歷史：報價紀錄表(即時+正式行) + 正式報價單(向後相容) 併讀、取最近一筆
    const latestQuote = async (
      quoteWhere: Prisma.Nx04QuoteWhereInput,
      recWhere: Prisma.Nx04QuoteRecordWhereInput,
    ) => {
      const [qi, qr] = await Promise.all([
        this.prisma.nx04QuoteItem.findFirst({
          where: { partId: pid, quote: { tenantId, voidedAt: null, quoteDate: { gte: cutoff }, ...quoteWhere } },
          orderBy: { quote: { quoteDate: 'desc' } },
          select: { unitPrice: true, quote: { select: { quoteDate: true } } },
        }),
        this.prisma.nx04QuoteRecord.findFirst({
          where: { tenantId, partId: pid, recordDate: { gte: cutoff }, ...recWhere },
          orderBy: { recordDate: 'desc' },
          select: { unitPrice: true, recordDate: true },
        }),
      ]);
      const a = qi ? { date: qi.quote.quoteDate, amount: qi.unitPrice.toString() } : null;
      const b = qr ? { date: qr.recordDate, amount: qr.unitPrice.toString() } : null;
      const pick = !a ? b : !b ? a : a.date.getTime() >= b.date.getTime() ? a : b;
      return pick ? { date: pick.date.toISOString(), amount: pick.amount } : null;
    };
    const latestSale = async (soWhere: Prisma.Nx04SoWhereInput) => {
      const r = await this.prisma.nx04SoItem.findFirst({
        where: { partId: pid, so: { tenantId, soDate: { gte: cutoff }, ...soWhere } },
        orderBy: { so: { soDate: 'desc' } },
        select: { unitPrice: true, so: { select: { soDate: true } } },
      });
      return r ? { date: r.so.soDate.toISOString(), amount: r.unitPrice.toString() } : null;
    };

    const [sameCustomerQuote, sameCustomerSale, sameGradeQuote, sameGradeSale] = await Promise.all([
      latestQuote({ customerId: customer.id }, { customerId: customer.id }),
      latestSale({ customerId: customer.id }),
      gradeId
        ? latestQuote(
            { customerId: { not: customer.id }, customerGradeId: gradeId },
            { customerId: { not: customer.id }, customerGradeId: gradeId },
          )
        : Promise.resolve(null),
      gradeId ? latestSale({ customerId: { not: customer.id }, customer: { customerGradeId: gradeId } }) : Promise.resolve(null),
    ]);

    return { suggestedPrice, sameCustomerQuote, sameCustomerSale, sameGradeQuote, sameGradeSale };
  }

  /**
   * 報價候選清單（批次報價 picker）：給 客戶 + 主件料號 + 出貨倉 →
   * 回傳該料的通用件群組全員（含自己），每列帶：
   *   · 該倉可出量
   *   · 上一次「該客戶」報價/銷貨（取最近一筆，date+amount）
   *   · 上一次「該零件」市場報價/銷貨（任一客戶，取最近一筆）
   *   · 建議售價：① 該客戶上次價 → ② 該零件市場近價 → ③ 客戶等級價(avgCost×(1+毛利率)) → ④ 空
   */
  async getQuoteCandidates(
    user: RequestUser,
    customerId: string,
    partId: string,
    warehouseId?: string,
  ) {
    const tenantId = requireTenantId(user);
    const customer = await this.prisma.nx01Partner.findFirst({
      where: { id: customerId.trim(), tenantId },
      select: { id: true, customerGradeId: true, defaultWarehouseId: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    // 出貨倉：指定 → 客戶預設 → 主倉 → 任一
    let wh = warehouseId?.trim()
      ? await this.prisma.nx01Warehouse.findFirst({
          where: { id: warehouseId.trim(), tenantId, isActive: true },
          select: { id: true, code: true, name: true },
        })
      : null;
    if (!wh && customer.defaultWarehouseId) {
      wh = await this.prisma.nx01Warehouse.findFirst({
        where: { id: customer.defaultWarehouseId, tenantId, isActive: true },
        select: { id: true, code: true, name: true },
      });
    }
    if (!wh) {
      wh = await this.prisma.nx01Warehouse.findFirst({
        where: { tenantId, isActive: true },
        orderBy: [{ isMain: 'desc' }, { code: 'asc' }],
        select: { id: true, code: true, name: true },
      });
    }
    if (!wh) throw new BadRequestException('找不到可用倉庫');
    const whId = wh.id;

    // 候選 = 該料通用件群組全員（含自己）；無群組 → 只有自己
    const PART_SEL = {
      id: true,
      code: true,
      name: true,
      secCode: true,
      isOem: true,
      isActive: true,
      cost: true,
      brand: { select: { code: true, name: true } },
    } as const;
    const memberships = await this.prisma.nx01PartCompatGroupMember.findMany({
      where: { tenantId, partId: partId.trim() },
      select: { groupId: true },
    });
    const groupIds = Array.from(new Set(memberships.map((m) => m.groupId)));
    type Cand = { partId: string; role: number; part: Prisma.Nx01PartGetPayload<{ select: typeof PART_SEL }> };
    let candidateParts: Cand[] = [];
    if (groupIds.length) {
      const members = await this.prisma.nx01PartCompatGroupMember.findMany({
        where: { tenantId, groupId: { in: groupIds } },
        orderBy: [{ role: 'asc' }, { sortNo: 'asc' }],
        select: { partId: true, role: true, part: { select: PART_SEL } },
      });
      const seen = new Set<string>();
      for (const m of members) {
        if (seen.has(m.partId)) continue;
        seen.add(m.partId);
        candidateParts.push({ partId: m.partId, role: m.role, part: m.part });
      }
    } else {
      const p = await this.prisma.nx01Part.findFirst({ where: { id: partId.trim(), tenantId }, select: PART_SEL });
      if (p) candidateParts = [{ partId: p.id, role: 1, part: p }];
    }
    const partIds = candidateParts.map((c) => c.partId);
    if (!partIds.length) return { warehouseId: whId, warehouseCode: wh.code, warehouseName: wh.name, warehouses: [], candidates: [] };

    // 各倉可出量（每列可換倉看庫存）
    const balances = await this.prisma.nx03StockBalance.findMany({
      where: { tenantId, partId: { in: partIds } },
      select: { partId: true, warehouseId: true, availableQty: true },
    });
    const stockByPart = new Map<string, Record<string, string>>();
    for (const b of balances) {
      let rec = stockByPart.get(b.partId);
      if (!rec) {
        rec = {};
        stockByPart.set(b.partId, rec);
      }
      rec[b.warehouseId] = b.availableQty.toString();
    }
    // 自動帶價一個月閘（執行長 2026-07-02）：本客戶最近報價/成交在一個月內才當預帶價，否則落建議售價
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 1);
    const activeWarehouses = await this.prisma.nx01Warehouse.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ isMain: 'desc' }, { code: 'asc' }],
      select: { id: true, code: true, name: true },
    });

    // 最近一筆（報價紀錄 + 正式報價單 + 銷貨合併取最新）——該客戶 / 該零件市場
    // 報價紀錄表(nx04_quote_record)＝即時報價+正式報價行的統一價格記憶；正式報價單(nx04QuoteItem)向後相容併讀
    const latestPerPart = (
      quotes: { partId: string; unitPrice: PrismaNs.Decimal; quote: { quoteDate: Date } }[],
      sos: { partId: string; unitPrice: PrismaNs.Decimal; so: { soDate: Date } }[],
      recs: { partId: string; unitPrice: PrismaNs.Decimal; recordDate: Date }[] = [],
    ) => {
      const m = new Map<string, { date: Date; amount: string }>();
      const consider = (pid: string, date: Date, amount: string) => {
        const ex = m.get(pid);
        if (!ex || date.getTime() > ex.date.getTime()) m.set(pid, { date, amount });
      };
      for (const r of quotes) consider(r.partId, r.quote.quoteDate, r.unitPrice.toString());
      for (const r of sos) consider(r.partId, r.so.soDate, r.unitPrice.toString());
      for (const r of recs) consider(r.partId, r.recordDate, r.unitPrice.toString());
      return m;
    };

    const [custQ, custS, mktQ, mktS, custRec, mktRec] = await Promise.all([
      this.prisma.nx04QuoteItem.findMany({
        where: { partId: { in: partIds }, quote: { tenantId, customerId: customer.id, voidedAt: null } },
        orderBy: { quote: { quoteDate: 'desc' } },
        take: 500,
        select: { partId: true, unitPrice: true, quote: { select: { quoteDate: true } } },
      }),
      this.prisma.nx04SoItem.findMany({
        where: { partId: { in: partIds }, so: { tenantId, customerId: customer.id } },
        orderBy: { so: { soDate: 'desc' } },
        take: 500,
        select: { partId: true, unitPrice: true, so: { select: { soDate: true } } },
      }),
      this.prisma.nx04QuoteItem.findMany({
        where: { partId: { in: partIds }, quote: { tenantId, voidedAt: null } },
        orderBy: { quote: { quoteDate: 'desc' } },
        take: 500,
        select: { partId: true, unitPrice: true, quote: { select: { quoteDate: true } } },
      }),
      this.prisma.nx04SoItem.findMany({
        where: { partId: { in: partIds }, so: { tenantId } },
        orderBy: { so: { soDate: 'desc' } },
        take: 500,
        select: { partId: true, unitPrice: true, so: { select: { soDate: true } } },
      }),
      // 報價紀錄表（即時報價 + 正式報價行）：該客戶 / 市場
      this.prisma.nx04QuoteRecord.findMany({
        where: { partId: { in: partIds }, tenantId, customerId: customer.id },
        orderBy: { recordDate: 'desc' },
        take: 500,
        select: { partId: true, unitPrice: true, recordDate: true },
      }),
      this.prisma.nx04QuoteRecord.findMany({
        where: { partId: { in: partIds }, tenantId },
        orderBy: { recordDate: 'desc' },
        take: 500,
        select: { partId: true, unitPrice: true, recordDate: true },
      }),
    ]);
    const customerLast = latestPerPart(custQ, custS, custRec);
    const partLast = latestPerPart(mktQ, mktS, mktRec);

    // 客戶等級毛利率（建議價 ③ fallback）
    let marginPct: PrismaNs.Decimal | null = null;
    if (customer.customerGradeId) {
      const grade = await this.prisma.nx01CustomerGrade.findFirst({
        where: { id: customer.customerGradeId, tenantId },
        select: { marginPct: true },
      });
      if (grade) marginPct = new PrismaNs.Decimal(grade.marginPct);
    }

    const candidates = candidateParts.map((c) => {
      const stockByWh = stockByPart.get(c.partId) ?? {};
      const cl = customerLast.get(c.partId);
      const pl = partLast.get(c.partId);
      // 自動帶價：① 本客戶最近(報價/成交)且一個月內 → 帶入；② 否則落建議售價(進價×(1+等級毛利率))。
      // 市場價(pl)只在比價面板顯示、不當自動填來源。
      let suggested: string | null = null;
      if (cl && cl.date.getTime() >= cutoff.getTime()) {
        suggested = cl.amount;
      } else if (marginPct && c.part.cost && new PrismaNs.Decimal(c.part.cost).gt(0)) {
        suggested = new PrismaNs.Decimal(c.part.cost).mul(marginPct.div(100).add(1)).toDecimalPlaces(2).toString();
      }
      return {
        id: c.part.id,
        code: c.part.code,
        name: c.part.name,
        secCode: c.part.secCode,
        brandCode: c.part.brand?.code ?? null,
        brandName: c.part.brand?.name ?? null,
        isOem: c.part.isOem,
        isActive: c.part.isActive,
        role: c.role,
        warehouseAvailable: stockByWh[whId] ?? '0',
        stockByWh,
        customerLastDate: cl ? cl.date.toISOString() : null,
        customerLastAmount: cl?.amount ?? null,
        partLastDate: pl ? pl.date.toISOString() : null,
        partLastAmount: pl?.amount ?? null,
        suggestedPrice: suggested,
      };
    });

    return {
      warehouseId: whId,
      warehouseCode: wh.code,
      warehouseName: wh.name,
      warehouses: activeWarehouses,
      candidates,
    };
  }

  /**
   * SO 拉報價後的 cascade 副作用（NX04-M2 §A C1 採用後失效機制、commit 2 SO 串接）
   *
   * 動作 1：被 SO 拉走的 quote（adoptedQuoteIds）若所有 isSelected line 都 transferredQty>=qty
   *         → quote.status = ACCEPTED（語意 ADOPTED）
   *
   * 動作 2：同客戶其他舊 quote（excluding adoptedQuoteIds）含相同 partId 的 line、
   *         status IN (DRAFT, SENT)、未作廢、未耗盡 →
   *         該 line transferredQty = qty 標記耗盡
   *         若整張 quote 的 isSelected line 都耗盡 → quote.status = CANCELLED（語意 REPLACED）
   *
   * 不寫 audit log：cascade 是 SO 觸發的副作用、SO commit 2 一起寫 audit。
   */
  async cascadeOnSoAdopt(
    tx: Prisma.TransactionClient,
    tenantId: string,
    customerId: string,
    adoptedQuoteIds: string[],
    adoptedPartIds: string[],
    userId: string,
  ): Promise<void> {
    // === 1. 被拉走的 quote 若耗盡 → ACCEPTED ===
    for (const aid of adoptedQuoteIds) {
      const items = await tx.nx04QuoteItem.findMany({
        where: { quoteId: aid, isSelected: true },
        select: { qty: true, transferredQty: true },
      });
      if (!items.length) continue;
      const allExhausted = items.every((it) =>
        new PrismaNs.Decimal(it.transferredQty).gte(new PrismaNs.Decimal(it.qty)),
      );
      if (!allExhausted) continue;
      const q = await tx.nx04Quote.findUnique({ where: { id: aid }, select: { status: true } });
      if (q && (q.status === QuoteStatus.DRAFT || q.status === QuoteStatus.SENT)) {
        await tx.nx04Quote.update({
          where: { id: aid },
          data: { status: QuoteStatus.ACCEPTED, updatedBy: userId },
        });
      }
    }

    // === 2. 同客戶舊 QT 同料件 line 失效 ===
    if (!adoptedPartIds.length) return;
    const candidates = await tx.nx04QuoteItem.findMany({
      where: {
        partId: { in: adoptedPartIds },
        quoteId: { notIn: adoptedQuoteIds },
        quote: {
          tenantId,
          customerId,
          status: { in: [QuoteStatus.DRAFT, QuoteStatus.SENT] },
          voidedAt: null,
        },
      },
      select: { id: true, quoteId: true, qty: true, transferredQty: true },
    });
    for (const c of candidates) {
      const qty = new PrismaNs.Decimal(c.qty);
      const transferred = new PrismaNs.Decimal(c.transferredQty);
      if (transferred.gte(qty)) continue;
      await tx.nx04QuoteItem.update({
        where: { id: c.id },
        data: { transferredQty: qty, updatedBy: userId },
      });
    }
    const affectedQuoteIds = Array.from(new Set(candidates.map((c) => c.quoteId)));
    for (const qid of affectedQuoteIds) {
      const items = await tx.nx04QuoteItem.findMany({
        where: { quoteId: qid, isSelected: true },
        select: { qty: true, transferredQty: true },
      });
      if (!items.length) continue;
      const allExhausted = items.every((it) =>
        new PrismaNs.Decimal(it.transferredQty).gte(new PrismaNs.Decimal(it.qty)),
      );
      if (!allExhausted) continue;
      const q = await tx.nx04Quote.findUnique({ where: { id: qid }, select: { status: true } });
      if (q && (q.status === QuoteStatus.DRAFT || q.status === QuoteStatus.SENT)) {
        await tx.nx04Quote.update({
          where: { id: qid },
          data: { status: QuoteStatus.CANCELLED, updatedBy: userId },
        });
      }
    }
  }

  async removeItem(user: RequestUser, quoteId: string, itemId: string) {
    const tenantId = requireTenantId(user);
    const head = await this.prisma.nx04Quote.findFirst({ where: { id: quoteId, tenantId }, select: Q_SEL });
    if (!head) throw new NotFoundException('Quote not found');
    if (head.voidedAt) throw new BadRequestException('Quote is voided');
    this.assertQuoteItemsEditable(head.status);
    const existing = await this.prisma.nx04QuoteItem.findFirst({ where: { id: itemId, quoteId }, select: Q_ITEM_SEL });
    if (!existing) throw new NotFoundException('Quote item not found');
    await this.prisma.nx04QuoteItem.delete({ where: { id: itemId } });
    await this.recalcQuoteTotals(this.prisma, quoteId, new PrismaNs.Decimal(head.taxRate));
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX04',
      action: 'DELETE',
      entityTable: 'nx04_quote_item',
      entityId: itemId,
      entityCode: head.docNo,
      summary: '刪除報價明細',
      beforeData: mapQuoteItemApi(existing) as object,
    });
    return { ok: true };
  }
}

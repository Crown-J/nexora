// packages/db-core/prisma/seed/demo/lib/builders.ts
// @FUNCTION_CODE SYS-DEMO-LIB-003-F01
// DEMO-02 builders：統一的 idempotent 建立 helper
//
// 設計原則：
//   - 每個 builder 接 DemoContext（prisma + tenantId + admin user + currency 等）
//   - has unique constraint → upsert
//   - no unique constraint → findFirst → create fallback
//   - 不走 nx-api（避免 server runtime 依賴），直接 prisma client 寫 DB
//   - 手動模擬 D4 trigger 寫法：建 SO 時 trigger 1 自動 update stock_balance.reservedQty

import type { PrismaClient } from '../../../../generated/prisma';
import { Prisma } from '../../../../generated/prisma';
import { anchorYyyymm } from './anchor-date';

const D = (v: number | string) => new Prisma.Decimal(v);

// ---------- Context ----------

export interface DemoContext {
  prisma: PrismaClient;
  tenantId: string;
  adminUserId: string;
  /** warehouses ordered: [main, branch1, branch2...] */
  warehouses: Array<{ id: string; code: string }>;
  /** customer_grade ids by tier */
  grades: { vip: string; good: string; normal: string; observe: string };
  /** part_brand 名稱 → id 對照（template seed 已建）*/
  partBrandIds: Record<string, string>;
  /** TWD currency id */
  twdId: string;
  /** default tax rate 5% */
  taxRate: number;
}

// ---------- Partner（C 客戶 / S 同行）----------

export async function ensurePartner(
  ctx: DemoContext,
  args: {
    code: string;
    name: string;
    type: 'C' | 'S';
    gradeId?: string | null;
    paymentTerm?: string;
    contactName?: string;
    phone?: string;
  },
): Promise<{ id: string }> {
  const existing = await ctx.prisma.nx01Partner.findFirst({
    where: { tenantId: ctx.tenantId, code: args.code },
    select: { id: true },
  });
  if (existing) return existing;
  return ctx.prisma.nx01Partner.create({
    data: {
      tenantId: ctx.tenantId,
      code: args.code,
      name: args.name,
      partnerType: args.type,
      customerGradeId: args.type === 'C' ? args.gradeId ?? null : null,
      paymentTermDomestic: args.paymentTerm ?? 'NET30',
      contactName: args.contactName ?? null,
      phone: args.phone ?? null,
      isActive: true,
      createdBy: ctx.adminUserId,
      updatedBy: ctx.adminUserId,
    },
    select: { id: true },
  });
}

// ---------- Part brand（demo 加 13 個車廠品牌、跟既有 10 個 OEM 品牌共存）----------

export async function ensurePartBrand(
  ctx: DemoContext,
  args: { code: string; name: string },
): Promise<{ id: string }> {
  return ctx.prisma.nx01PartBrand.upsert({
    where: { tenantId_code: { tenantId: ctx.tenantId, code: args.code } },
    create: {
      tenantId: ctx.tenantId,
      code: args.code,
      name: args.name,
      isActive: true,
      sortNo: 100, // 排在 template 既有 10 個 OEM 品牌之後
      createdBy: ctx.adminUserId,
      updatedBy: ctx.adminUserId,
    },
    update: {},
    select: { id: true },
  });
}

// ---------- Brand code rule ----------

export async function ensureBrandCodeRule(
  ctx: DemoContext,
  partBrandId: string,
  ruleName: string,
): Promise<{ id: string }> {
  const existing = await ctx.prisma.nx01BrandCodeRule.findFirst({
    where: { tenantId: ctx.tenantId, partBrandId },
    select: { id: true },
  });
  if (existing) return existing;
  return ctx.prisma.nx01BrandCodeRule.create({
    data: {
      tenantId: ctx.tenantId,
      partBrandId,
      name: ruleName,
      seg1: 3,
      seg2: 3,
      seg3: 3,
      createdBy: ctx.adminUserId,
      updatedBy: ctx.adminUserId,
    },
    select: { id: true },
  });
}

// ---------- Part ----------

export async function ensurePart(
  ctx: DemoContext,
  args: {
    code: string;
    name: string;
    codeRuleId: string;
    partBrandId: string;
  },
): Promise<{ id: string }> {
  const existing = await ctx.prisma.nx01Part.findFirst({
    where: { tenantId: ctx.tenantId, code: args.code },
    select: { id: true },
  });
  if (existing) return existing;
  return ctx.prisma.nx01Part.create({
    data: {
      tenantId: ctx.tenantId,
      codeRuleId: args.codeRuleId,
      code: args.code,
      name: args.name,
      partBrandId: args.partBrandId,
      isActive: true,
      createdBy: ctx.adminUserId,
      updatedBy: ctx.adminUserId,
    },
    select: { id: true },
  });
}

// ---------- Location ----------

export async function ensureLocation(
  ctx: DemoContext,
  args: { warehouseId: string; code: string; name: string },
): Promise<{ id: string }> {
  const existing = await ctx.prisma.nx01Location.findFirst({
    where: { tenantId: ctx.tenantId, warehouseId: args.warehouseId, code: args.code },
    select: { id: true },
  });
  if (existing) return existing;
  return ctx.prisma.nx01Location.create({
    data: {
      tenantId: ctx.tenantId,
      warehouseId: args.warehouseId,
      code: args.code,
      name: args.name,
      createdBy: ctx.adminUserId,
      updatedBy: ctx.adminUserId,
    },
    select: { id: true },
  });
}

// ---------- Stock balance（起帳存）----------

export async function ensureStockBalance(
  ctx: DemoContext,
  args: { partId: string; warehouseId: string; onHandQty: number; avgCost: number },
): Promise<{ id: string }> {
  const result = await ctx.prisma.nx03StockBalance.upsert({
    where: {
      tenantId_partId_warehouseId: {
        tenantId: ctx.tenantId,
        partId: args.partId,
        warehouseId: args.warehouseId,
      },
    },
    create: {
      tenantId: ctx.tenantId,
      partId: args.partId,
      warehouseId: args.warehouseId,
      onHandQty: D(args.onHandQty),
      reservedQty: D(0),
      availableQty: D(args.onHandQty),
      avgCost: D(args.avgCost),
      stockValue: D(args.onHandQty * args.avgCost),
      isActive: true,
      createdBy: ctx.adminUserId,
      updatedBy: ctx.adminUserId,
    },
    update: {}, // idempotent: 既有資料不覆寫（避免 demo 跑兩次把業務歷史撞壞）
    select: { id: true },
  });
  return result;
}

// ---------- DocNo helper (demo 範圍 99XXX 序號) ----------

export function makeDemoDocNo(
  type: string,
  warehouseCode: string,
  idx: number,
  yyyymm: string = anchorYyyymm(),
): string {
  return `${type}-${yyyymm}-${warehouseCode}-99${String(idx).padStart(3, '0')}`;
}

// ---------- SO + line items ----------

export interface SoLineItemInput {
  partId: string;
  partNo: string;
  partName: string;
  warehouseId: string;
  locationId?: string | null;
  qty: number;
  unitPrice: number;
  /** S=self, T=transfer, G=inquiry, B=co */
  transferSourceType: 'S' | 'T' | 'G' | 'B';
  /** 對應 type='T' 的 fromWarehouseId / type='G' 的 inquiryPartnerId / type='B' 不需要 */
  transferSourceRef?: string | null;
  /** 為空時依 type 計算（S=C/W；其他 P/W）*/
  transferStatus?: 'P' | 'I' | 'C';
  fulfillStatus?: 'W' | 'PK' | 'PL' | 'D' | 'F';
}

export interface EnsureSoArgs {
  docNo: string;
  customerId: string;
  soDate: Date;
  expectedDeliveryDate?: Date | null;
  status?: string;
  warehouseId: string;
  lineItems: SoLineItemInput[];
}

export async function ensureSo(
  ctx: DemoContext,
  args: EnsureSoArgs,
): Promise<{ soId: string; soItemIds: string[] }> {
  const existing = await ctx.prisma.nx04So.findFirst({
    where: { tenantId: ctx.tenantId, docNo: args.docNo },
    select: { id: true, rev_Nx04SoItem_soId: { select: { id: true }, orderBy: { lineNo: 'asc' } } },
  });
  if (existing) {
    return {
      soId: existing.id,
      soItemIds: existing.rev_Nx04SoItem_soId.map((it) => it.id),
    };
  }

  const subtotal = args.lineItems.reduce((s, it) => s + it.qty * it.unitPrice, 0);
  const taxAmount = Math.round(subtotal * (ctx.taxRate / 100));
  const totalAmount = subtotal + taxAmount;

  const so = await ctx.prisma.nx04So.create({
    data: {
      tenantId: ctx.tenantId,
      docNo: args.docNo,
      warehouseId: args.warehouseId,
      soDate: args.soDate,
      customerId: args.customerId,
      deliveryType: 'D',
      sourceType: 'S', // trigger 4 強制
      currencyId: ctx.twdId,
      taxRate: D(ctx.taxRate),
      subtotal: D(subtotal),
      taxAmount: D(taxAmount),
      totalAmount: D(totalAmount),
      status: args.status ?? 'CONFIRMED',
      paymentTerm: 'NET30',
      expectedDeliveryDate: args.expectedDeliveryDate ?? null,
      createdAt: args.soDate, // dormant 期 SO 的 createdAt 對齊 soDate
      createdBy: ctx.adminUserId,
      updatedBy: ctx.adminUserId,
    },
    select: { id: true },
  });

  const soItemIds: string[] = [];
  let lineNo = 1;
  for (const it of args.lineItems) {
    const initialTransferStatus =
      it.transferStatus ?? (it.transferSourceType === 'S' ? 'C' : 'P');
    const initialFulfillStatus = it.fulfillStatus ?? 'W';
    const lineAmount = it.qty * it.unitPrice;
    const created = await ctx.prisma.nx04SoItem.create({
      data: {
        soId: so.id,
        lineNo,
        partId: it.partId,
        partNo: it.partNo,
        partName: it.partName,
        warehouseId: it.warehouseId,
        locationId: it.locationId ?? null,
        qty: D(it.qty),
        unitPrice: D(it.unitPrice),
        lineAmount: D(lineAmount),
        reservedQty: D(0), // trigger 1 會重算
        transferSourceType: it.transferSourceType,
        transferStatus: initialTransferStatus,
        fulfillStatus: initialFulfillStatus,
        // itemStatus 不寫 — trigger 3 會雙寫
        createdBy: ctx.adminUserId,
        updatedBy: ctx.adminUserId,
      },
      select: { id: true },
    });
    soItemIds.push(created.id);
    lineNo++;
  }

  return { soId: so.id, soItemIds };
}

// ---------- RFQ stub（type='G' D4 自動建模擬）----------

export async function ensureRfqStub(
  ctx: DemoContext,
  args: {
    docNo: string;
    sourceSoItemId: string;
    partId: string;
    partNo: string;
    partName: string;
    warehouseId: string;
    qty: number;
    rfqDate: Date;
    supplierId?: string | null;
    /** RFQ status: DRAFT / SENT / REPLIED / CLOSED / CANCELLED */
    status?: string;
  },
): Promise<{ rfqId: string; rfqItemId: string }> {
  const existing = await ctx.prisma.nx02Rfq.findFirst({
    where: { tenantId: ctx.tenantId, docNo: args.docNo },
    select: {
      id: true,
      rev_Nx02RfqItem_rfqId: { select: { id: true }, orderBy: { lineNo: 'asc' } },
    },
  });
  if (existing) {
    return {
      rfqId: existing.id,
      rfqItemId: existing.rev_Nx02RfqItem_rfqId[0]?.id ?? '',
    };
  }

  const rfq = await ctx.prisma.nx02Rfq.create({
    data: {
      tenantId: ctx.tenantId,
      docNo: args.docNo,
      rfqDate: args.rfqDate,
      warehouseId: args.warehouseId,
      supplierId: args.supplierId ?? null,
      currency: 'TWD',
      status: args.status ?? 'DRAFT',
      rfqType: 'P', // 同行調貨
      rfqReason: 'T',
      sourceSoItemId: args.sourceSoItemId,
      createdAt: args.rfqDate,
      createdBy: ctx.adminUserId,
      updatedBy: ctx.adminUserId,
    },
    select: { id: true },
  });

  const rfqItem = await ctx.prisma.nx02RfqItem.create({
    data: {
      rfqId: rfq.id,
      lineNo: 1,
      partId: args.partId,
      partNo: args.partNo,
      partName: args.partName,
      qty: D(args.qty),
      currencyId: ctx.twdId,
      createdBy: ctx.adminUserId,
      updatedBy: ctx.adminUserId,
    },
    select: { id: true },
  });

  return { rfqId: rfq.id, rfqItemId: rfqItem.id };
}

// ---------- QT（同行報價）----------

export async function ensureQt(
  ctx: DemoContext,
  args: {
    rfqId: string;
    inquiryPartnerId: string;
    quotedPrice: number;
    quotedQuantity: number;
    status?: 'P' | 'A' | 'R';
    rejectReason?: string | null;
    leadDays?: number | null;
    createdAt: Date;
  },
): Promise<{ id: string }> {
  // QT 沒 unique constraint，用 (rfqId, partner, createdAt) 三元組去重
  const existing = await ctx.prisma.nx02Qt.findFirst({
    where: {
      tenantId: ctx.tenantId,
      rfqId: args.rfqId,
      inquiryPartnerId: args.inquiryPartnerId,
      createdAt: args.createdAt,
    },
    select: { id: true },
  });
  if (existing) return existing;

  return ctx.prisma.nx02Qt.create({
    data: {
      tenantId: ctx.tenantId,
      rfqId: args.rfqId,
      inquiryPartnerId: args.inquiryPartnerId,
      quotedPrice: D(args.quotedPrice),
      quotedQuantity: D(args.quotedQuantity),
      leadDays: args.leadDays ?? null,
      status: args.status ?? 'P',
      rejectReason: args.rejectReason ?? null,
      createdAt: args.createdAt,
      createdBy: ctx.adminUserId,
      updatedBy: ctx.adminUserId,
    },
    select: { id: true },
  });
}

// ---------- TI + item（B5 採用 QT 後建）----------

export async function ensureTi(
  ctx: DemoContext,
  args: {
    docNo: string;
    rfqId: string;
    sourceSoItemId: string;
    partnerId: string;
    warehouseId: string;
    partId: string;
    partNo: string;
    partName: string;
    qty: number;
    unitCost: number;
    tiDate: Date;
    status?: string;
  },
): Promise<{ tiId: string; tiItemId: string }> {
  const existing = await ctx.prisma.nx02Ti.findFirst({
    where: { tenantId: ctx.tenantId, docNo: args.docNo },
    select: {
      id: true,
      rev_Nx02TiItem_tiId: { select: { id: true }, orderBy: { lineNo: 'asc' } },
    },
  });
  if (existing) {
    return { tiId: existing.id, tiItemId: existing.rev_Nx02TiItem_tiId[0]?.id ?? '' };
  }

  const subtotal = args.qty * args.unitCost;
  const taxAmount = Math.round(subtotal * (ctx.taxRate / 100));
  const totalAmount = subtotal + taxAmount;

  const ti = await ctx.prisma.nx02Ti.create({
    data: {
      tenantId: ctx.tenantId,
      docNo: args.docNo,
      warehouseId: args.warehouseId,
      tiDate: args.tiDate,
      partnerId: args.partnerId,
      rfqId: args.rfqId,
      currencyId: ctx.twdId,
      status: args.status ?? 'D',
      subtotal: D(subtotal),
      taxRate: D(ctx.taxRate),
      taxAmount: D(taxAmount),
      totalAmount: D(totalAmount),
      createdAt: args.tiDate,
      createdBy: ctx.adminUserId,
      updatedBy: ctx.adminUserId,
    },
    select: { id: true },
  });

  const tiItem = await ctx.prisma.nx02TiItem.create({
    data: {
      tiId: ti.id,
      lineNo: 1,
      partId: args.partId,
      partNo: args.partNo,
      partName: args.partName,
      qty: D(args.qty),
      unitCost: D(args.unitCost),
      lineAmount: D(subtotal),
      sourceSoItemId: args.sourceSoItemId,
      createdBy: ctx.adminUserId,
      updatedBy: ctx.adminUserId,
    },
    select: { id: true },
  });

  // 同步 update SO line item.tiId + transferStatus='C'（D4 + B5 對齊）
  await ctx.prisma.nx04SoItem.update({
    where: { id: args.sourceSoItemId },
    data: { tiId: ti.id, transferStatus: 'C', updatedBy: ctx.adminUserId },
  });

  return { tiId: ti.id, tiItemId: tiItem.id };
}

// ---------- CO（type='B' D4 自動建模擬）----------

export async function ensureCo(
  ctx: DemoContext,
  args: {
    docNo: string;
    customerId: string;
    sourceSoItemId: string;
    warehouseId: string;
    partId: string;
    qty: number;
    coDate: Date;
    expectedFulfillDate?: Date | null;
    status?: string;
  },
): Promise<{ id: string }> {
  const existing = await ctx.prisma.nx04Co.findFirst({
    where: { tenantId: ctx.tenantId, docNo: args.docNo },
    select: { id: true },
  });
  if (existing) return existing;

  const co = await ctx.prisma.nx04Co.create({
    data: {
      tenantId: ctx.tenantId,
      warehouseId: args.warehouseId,
      docNo: args.docNo,
      coDate: args.coDate,
      customerId: args.customerId,
      partId: args.partId,
      qty: D(args.qty),
      expectedFulfillDate: args.expectedFulfillDate ?? null,
      status: args.status ?? 'P',
      sourceSoItemId: args.sourceSoItemId,
      createdAt: args.coDate,
      createdBy: ctx.adminUserId,
      updatedBy: ctx.adminUserId,
    },
    select: { id: true },
  });

  // 同步 update SO line item.coId
  await ctx.prisma.nx04SoItem.update({
    where: { id: args.sourceSoItemId },
    data: { coId: co.id, transferStatus: 'I', updatedBy: ctx.adminUserId },
  });

  return co;
}

// ---------- ST + item（type='T' D4 自動建模擬）----------

export async function ensureSt(
  ctx: DemoContext,
  args: {
    docNo: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    refSoId: string;
    sourceSoItemId: string;
    partId: string;
    partNo: string;
    partName: string;
    qty: number;
    stDate: Date;
    status?: string;
  },
): Promise<{ stId: string; stItemId: string }> {
  const existing = await ctx.prisma.nx03St.findFirst({
    where: { tenantId: ctx.tenantId, docNo: args.docNo },
    select: {
      id: true,
      rev_Nx03StItem_stId: { select: { id: true }, orderBy: { lineNo: 'asc' } },
    },
  });
  if (existing) {
    return { stId: existing.id, stItemId: existing.rev_Nx03StItem_stId[0]?.id ?? '' };
  }

  const st = await ctx.prisma.nx03St.create({
    data: {
      tenantId: ctx.tenantId,
      docNo: args.docNo,
      stDate: args.stDate,
      fromWarehouseId: args.fromWarehouseId,
      toWarehouseId: args.toWarehouseId,
      status: args.status ?? 'DRAFT',
      stType: 'A',
      triggerSource: 'S',
      refSoId: args.refSoId,
      createdAt: args.stDate,
      createdBy: ctx.adminUserId,
      updatedBy: ctx.adminUserId,
    },
    select: { id: true },
  });

  const stItem = await ctx.prisma.nx03StItem.create({
    data: {
      stId: st.id,
      lineNo: 1,
      partId: args.partId,
      partNo: args.partNo,
      partName: args.partName,
      qty: D(args.qty),
      unitCost: D(0),
      sourceSoItemId: args.sourceSoItemId,
      createdBy: ctx.adminUserId,
      updatedBy: ctx.adminUserId,
    },
    select: { id: true },
  });

  // 同步 update SO line item.stId + transferStatus='I'（同 D4 模式）
  await ctx.prisma.nx04SoItem.update({
    where: { id: args.sourceSoItemId },
    data: { stId: st.id, transferStatus: 'I', updatedBy: ctx.adminUserId },
  });

  return { stId: st.id, stItemId: stItem.id };
}

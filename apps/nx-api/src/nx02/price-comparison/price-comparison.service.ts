// apps/nx-api/src/nx02/price-comparison/price-comparison.service.ts
// NX02 PriceComparison service（比價分析 3 維度）
//
// 對齊：
//   - overview §3.4 比價分析（業界改革候選 ⭐⭐）
//   - Crown Q12 拍板：歷史單價趨勢 + 廠商主動推案（新品/特價）+ 採購量彈性折扣
//   - Crown Q-C2=A 全 3 維落地（避免重塑）
//
// 3 維度：
//   D1 歷史均價：90 天歷史 PoItem group by supplierId → AVG/MIN/MAX/COUNT + 趨勢
//   D2 新品/特價：30 天 Qt 報價紀錄（含 notes 業務手記、採購員自己判讀）
//   D3 量大彈性折扣：歷史 PoItem 按 qty 等距分桶（1-99 / 100-499 / 500+）、各桶平均單價
//
// meta 補充：
//   - partnerPartMaster：PartnerPart 主檔的 defaultUnitCost / defaultLeadDays / moq（採購員快速參考）

import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type { PriceComparisonQueryDto } from './dto/price-comparison.dto';

const DEFAULT_LOOKBACK_DAYS = 90;
const DEFAULT_RECENT_DAYS = 30;

// 量折分桶（業界 muscle memory：100/500 為常見訂購量階梯）
const QTY_BUCKETS = [
  { label: '1-99', min: new PrismaNs.Decimal(0), max: new PrismaNs.Decimal(99) },
  { label: '100-499', min: new PrismaNs.Decimal(100), max: new PrismaNs.Decimal(499) },
  { label: '500+', min: new PrismaNs.Decimal(500), max: null as PrismaNs.Decimal | null },
];

@Injectable()
export class PriceComparisonService {
  constructor(private readonly prisma: PrismaService) {}

  async compareByPartId(user: RequestUser, partId: string, q: PriceComparisonQueryDto) {
    const tenantId = requireTenantId(user);
    const lookbackDays = q.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
    const recentDays = q.recentDays ?? DEFAULT_RECENT_DAYS;
    const now = new Date();
    const lookbackCutoff = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
    const recentCutoff = new Date(now.getTime() - recentDays * 24 * 60 * 60 * 1000);

    // 校驗 part 存在
    const part = await this.prisma.nx01Part.findFirst({
      where: { id: partId, tenantId },
      select: { id: true, code: true, name: true, isOem: true, partBrandId: true, partBrand: { select: { code: true, name: true } } },
    });
    if (!part) throw new NotFoundException('Part not found');

    // ============================================================
    // D1：歷史均價（90 天 PoItem group by supplierId）
    // ============================================================
    const poWhere: Prisma.Nx02PoWhereInput = {
      tenantId,
      poDate: { gte: lookbackCutoff },
      voidedAt: null,
      ...(q.supplierId?.trim() ? { supplierId: q.supplierId.trim() } : {}),
    };
    const historyWhere: Prisma.Nx02PoItemWhereInput = {
      partId,
      po: poWhere,
    };
    const historyRows = await this.prisma.nx02PoItem.findMany({
      where: historyWhere,
      select: {
        unitCost: true,
        qty: true,
        po: { select: { supplierId: true, poDate: true, currencyId: true, supplier: { select: { code: true, name: true } } } },
      },
    });

    // group by supplierId
    const supplierMap = new Map<
      string,
      {
        supplierId: string;
        supplierCode: string;
        supplierName: string;
        currencyId: string;
        rows: { unitCost: PrismaNs.Decimal; qty: PrismaNs.Decimal; poDate: Date }[];
      }
    >();
    for (const r of historyRows) {
      const key = r.po.supplierId;
      if (!supplierMap.has(key)) {
        supplierMap.set(key, {
          supplierId: key,
          supplierCode: r.po.supplier.code,
          supplierName: r.po.supplier.name,
          currencyId: r.po.currencyId,
          rows: [],
        });
      }
      supplierMap.get(key)!.rows.push({
        unitCost: new PrismaNs.Decimal(r.unitCost),
        qty: new PrismaNs.Decimal(r.qty),
        poDate: r.po.poDate,
      });
    }

    const historyBySupplier = Array.from(supplierMap.values()).map((s) => {
      const costs = s.rows.map((r) => r.unitCost);
      const sumQty = s.rows.reduce((acc, r) => acc.add(r.qty), new PrismaNs.Decimal(0));
      const sumCost = s.rows.reduce((acc, r) => acc.add(r.unitCost.mul(r.qty)), new PrismaNs.Decimal(0));
      const wAvg = sumQty.gt(0) ? sumCost.div(sumQty).toDecimalPlaces(4) : new PrismaNs.Decimal(0);
      const min = costs.reduce((a, b) => (a.lt(b) ? a : b));
      const max = costs.reduce((a, b) => (a.gt(b) ? a : b));
      const lastPoDate = s.rows.map((r) => r.poDate).sort((a, b) => b.getTime() - a.getTime())[0];
      return {
        supplierId: s.supplierId,
        supplierCode: s.supplierCode,
        supplierName: s.supplierName,
        currencyId: s.currencyId,
        poCount: s.rows.length,
        weightedAvgUnitCost: wAvg.toString(),
        minUnitCost: min.toString(),
        maxUnitCost: max.toString(),
        totalQty: sumQty.toString(),
        lastPoDate,
      };
    });

    // ============================================================
    // D2：新品/特價（30 天 Qt 採用紀錄、含 notes 給採購員判讀）
    // ============================================================
    const recentQts = await this.prisma.nx02Qt.findMany({
      where: {
        tenantId,
        createdAt: { gte: recentCutoff },
        rfq: { rev_Nx02RfqItem_rfqId: { some: { partId } } },
        ...(q.supplierId?.trim() ? { inquiryPartnerId: q.supplierId.trim() } : {}),
      },
      select: {
        id: true,
        quotedPrice: true,
        quotedQuantity: true,
        leadDays: true,
        status: true,
        notes: true,
        createdAt: true,
        inquiryPartner: { select: { id: true, code: true, name: true } },
        rfq: { select: { docNo: true, rfqType: true, rfqReason: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const recentQuotes = recentQts.map((q) => ({
      qtId: q.id,
      supplierId: q.inquiryPartner.id,
      supplierCode: q.inquiryPartner.code,
      supplierName: q.inquiryPartner.name,
      quotedPrice: q.quotedPrice.toString(),
      quotedQuantity: q.quotedQuantity.toString(),
      leadDays: q.leadDays,
      status: q.status,
      notes: q.notes, // 業務手記、可能含「新品/特價/限時」業務語意
      rfqDocNo: q.rfq.docNo,
      rfqType: q.rfq.rfqType,
      rfqReason: q.rfq.rfqReason, // 可能含 'N'=新品 / 'P'=特價（schema 註解 line 1829）
      createdAt: q.createdAt,
    }));

    // ============================================================
    // D3：量大彈性折扣（PoItem 按 qty 分桶、每桶平均單價）
    // ============================================================
    const allHistoryRows = historyRows.map((r) => ({
      unitCost: new PrismaNs.Decimal(r.unitCost),
      qty: new PrismaNs.Decimal(r.qty),
    }));
    const qtyBuckets = QTY_BUCKETS.map((bucket) => {
      const rowsInBucket = allHistoryRows.filter((r) => {
        const inMin = r.qty.gte(bucket.min);
        const inMax = bucket.max === null ? true : r.qty.lte(bucket.max);
        return inMin && inMax;
      });
      if (rowsInBucket.length === 0) {
        return { bucket: bucket.label, poCount: 0, avgUnitCost: null, minUnitCost: null, maxUnitCost: null };
      }
      const sumQty = rowsInBucket.reduce((acc, r) => acc.add(r.qty), new PrismaNs.Decimal(0));
      const sumCost = rowsInBucket.reduce((acc, r) => acc.add(r.unitCost.mul(r.qty)), new PrismaNs.Decimal(0));
      const wAvg = sumQty.gt(0) ? sumCost.div(sumQty).toDecimalPlaces(4) : new PrismaNs.Decimal(0);
      const costs = rowsInBucket.map((r) => r.unitCost);
      const min = costs.reduce((a, b) => (a.lt(b) ? a : b));
      const max = costs.reduce((a, b) => (a.gt(b) ? a : b));
      return {
        bucket: bucket.label,
        poCount: rowsInBucket.length,
        avgUnitCost: wAvg.toString(),
        minUnitCost: min.toString(),
        maxUnitCost: max.toString(),
      };
    });

    // ============================================================
    // meta：PartnerPart 主檔資訊（採購員快速參考）
    // ============================================================
    const partnerPartMaster = await this.prisma.nx02PartnerPart.findMany({
      where: {
        tenantId,
        partId,
        isActive: true,
        ...(q.supplierId?.trim() ? { partnerId: q.supplierId.trim() } : {}),
      },
      select: {
        partnerId: true,
        isPrimary: true,
        supplierPartNo: true,
        defaultUnitCost: true,
        defaultLeadDays: true,
        moq: true,
        source: true,
        partner: { select: { code: true, name: true } },
      },
      orderBy: [{ isPrimary: 'desc' }, { partner: { code: 'asc' } }],
    });

    return {
      part: {
        id: part.id,
        code: part.code,
        name: part.name,
        isOem: part.isOem,
        partBrand: part.partBrand,
      },
      windowMeta: { lookbackDays, recentDays },
      dimensions: {
        d1_historyAvgBySupplier: historyBySupplier,
        d2_recentQuotes: recentQuotes,
        d3_qtyBuckets: qtyBuckets,
      },
      partnerPartMaster,
    };
  }
}

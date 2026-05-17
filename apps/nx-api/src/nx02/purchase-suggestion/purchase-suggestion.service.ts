// apps/nx-api/src/nx02/purchase-suggestion/purchase-suggestion.service.ts
// NX02 PurchaseSuggestion service（採購建議單列表核心）
//
// 對齊：
//   - overview §3.3 採購需求單來源（demandType S=AR 自動 / O=客訂銷售建）
//   - Crown Q11 + Q17 客訂優先（純標記、UI 高亮、service ORDER BY demandType desc）
//   - Crown Q20 列表式（仿撿貨單、可按廠商過濾）
//   - Crown Q-PP-1=C 混合範式（PartnerPart 主檔 → fallback 90 天歷史 PoItem）
//   - Crown Q-PS-1=b 90 天歷史推算窗
//   - Crown Q-C1 客訂優先實作策略（C 兩者並用、service 排序 + UI 高亮）
//
// 業務語意：
//   - 列表顯示「status=O 待處理」的 Nx02Demand row
//   - supplierId 過濾：列表只顯示「該廠商可供應料件」（主檔 + 歷史推算）
//   - 排序：demandType O(客訂) 排前 → S(AR) 排後 → expectedDate asc（急的排前）

import { Injectable } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import type { PurchaseSuggestionListQueryDto } from './dto/purchase-suggestion.dto';

const LOOKBACK_DAYS = 90; // Crown Q-PS-1=b 90 天歷史推算窗

const DEMAND_SEL = {
  id: true,
  docNo: true,
  demandType: true,
  partId: true,
  warehouseId: true,
  qty: true,
  customerId: true,
  expectedDate: true,
  status: true,
  remark: true,
  createdAt: true,
  createdBy: true,
} as const;

@Injectable()
export class PurchaseSuggestionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 混合範式 partId 推算（Crown Q-PP-1=C）
   *   - 主檔：PartnerPart isActive=true、validFrom <= now && (validTo IS NULL || validTo > now)
   *   - fallback：PoItem 90 天歷史 supplierId join Po.supplierId
   *   - 結果：DISTINCT partId 集合（該廠商可供應料件）
   */
  private async resolveSupplierPartIds(tenantId: string, supplierId: string): Promise<string[]> {
    const now = new Date();
    const cutoff = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    // 路徑 A：主檔層 PartnerPart
    const masterRows = await this.prisma.nx02PartnerPart.findMany({
      where: {
        tenantId,
        partnerId: supplierId,
        isActive: true,
        OR: [{ validFrom: null }, { validFrom: { lte: now } }],
        AND: [{ OR: [{ validTo: null }, { validTo: { gt: now } }] }],
      },
      select: { partId: true },
    });
    const masterPartIds = new Set(masterRows.map((r) => r.partId));

    // 路徑 B：fallback 90 天歷史 PoItem
    const historyRows = await this.prisma.nx02PoItem.findMany({
      where: {
        po: { tenantId, supplierId, poDate: { gte: cutoff }, voidedAt: null },
      },
      select: { partId: true },
      distinct: ['partId'],
    });
    const historyPartIds = new Set(historyRows.map((r) => r.partId));

    // union（主檔 + 歷史、去重）
    return Array.from(new Set([...masterPartIds, ...historyPartIds]));
  }

  async list(user: RequestUser, q: PurchaseSuggestionListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;

    const where: Prisma.Nx02DemandWhereInput = {
      tenantId,
      status: 'O', // 僅顯示「待處理」
    };

    if (q.warehouseId?.trim()) where.warehouseId = q.warehouseId.trim();
    if (q.demandType) where.demandType = q.demandType;
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { docNo: { contains: s, mode: 'insensitive' } },
        { remark: { contains: s, mode: 'insensitive' } },
        { part: { code: { contains: s, mode: 'insensitive' } } },
        { part: { name: { contains: s, mode: 'insensitive' } } },
      ];
    }

    // supplierId 篩：混合範式 partId 過濾
    let supplierPartIds: string[] | null = null;
    if (q.supplierId?.trim()) {
      supplierPartIds = await this.resolveSupplierPartIds(tenantId, q.supplierId.trim());
      // 空集合 = 廠商無可供應料件、直接回空列表
      if (supplierPartIds.length === 0) {
        return {
          page,
          pageSize,
          total: 0,
          items: [],
          supplierFilterMeta: {
            supplierId: q.supplierId.trim(),
            supplierPartCount: 0,
            note: 'no parts found in master nor 90-day history',
          },
        };
      }
      where.partId = { in: supplierPartIds };
    }

    const [total, rows] = await Promise.all([
      this.prisma.nx02Demand.count({ where }),
      this.prisma.nx02Demand.findMany({
        where,
        // Crown Q11/Q17 + Q-C1=C：客訂優先 O→S、急的排前（expectedDate asc）、新單後排
        orderBy: [
          { demandType: 'desc' }, // O=客訂排前（'O' > 'S' 字典序）
          { expectedDate: 'asc' }, // null 排後（Prisma 預設 nulls last）
          { createdAt: 'asc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          ...DEMAND_SEL,
          part: { select: { code: true, name: true, isOem: true, partBrandId: true } },
          warehouse: { select: { code: true, name: true } },
          customer: { select: { code: true, name: true } },
        },
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: rows,
      ...(q.supplierId?.trim() && supplierPartIds
        ? {
            supplierFilterMeta: {
              supplierId: q.supplierId.trim(),
              supplierPartCount: supplierPartIds.length,
              note: 'partner_part master + 90-day PoItem history (Crown Q-PP-1=C)',
            },
          }
        : {}),
    };
  }
}

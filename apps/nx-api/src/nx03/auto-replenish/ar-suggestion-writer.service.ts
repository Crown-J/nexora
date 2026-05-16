// apps/nx-api/src/nx03/auto-replenish/ar-suggestion-writer.service.ts
// AR 建議單 writer service（Stage 1~4 結果 → 批次寫入 Nx02Demand）
// 對齊 overview §3.1 詢價接點 + §7 走既有 Nx02Demand demandType='S'
// Crown Q-C2=A 直接寫 Demand（不用 staging）
//
// 業務範式：
//   - 每候選對應「1 個 batch、N 個 Demand row」
//     - OE 部分：找 model 的 fitLevel=1 OE part、寫 1 Demand
//     - 副廠部分：Stage 4 breakdowns 每副廠 part 寫 1 Demand
//   - modelId=null fallback：純寫 1 Demand（candidate.partId、qty=forecastQty）
//   - batch context 用 docNo prefix 標識 + remark 寫推算理由
//   - 寫完更新 PartStockSetting.lastCalculatedAt（scheduler 判下次跑用）

import { Injectable } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import { ArCalculatorService, type AllocationResult, type ForecastResult } from './ar-calculator.service';
import { PartReplacementService } from './part-replacement.service';

export type ArRunResult = {
  /** AR batch 識別（ISO timestamp）、寫入 Demand.remark 前綴。 */
  batchId: string;
  warehouseId: string | null;
  candidatesCount: number;
  demandsCreated: number;
  demandIds: string[];
  skipped: Array<{ partId: string; reason: string }>;
};

@Injectable()
export class ArSuggestionWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly arCalc: ArCalculatorService,
    private readonly partReplacement: PartReplacementService,
  ) {}

  /**
   * 主入口：對指定倉跑完 AR 4 階段 + 寫 Demand + 更新 lastCalculatedAt
   *
   * @param user 觸發者
   * @param warehouseId 可選、undefined=全倉
   */
  async runForWarehouse(user: RequestUser, warehouseId?: string): Promise<ArRunResult> {
    const tenantId = requireTenantId(user);
    const userId = user.sub;
    const batchId = `AR-${new Date().toISOString().replace(/[:.]/g, '-')}`;

    const candidates = await this.arCalc.detectShortageCandidates(tenantId, warehouseId);
    const demandIds: string[] = [];
    const skipped: Array<{ partId: string; reason: string }> = [];

    if (!candidates.length) {
      return {
        batchId,
        warehouseId: warehouseId ?? null,
        candidatesCount: 0,
        demandsCreated: 0,
        demandIds: [],
        skipped: [],
      };
    }

    await this.prisma.$transaction(async (tx) => {
      for (const candidate of candidates) {
        const forecast = await this.arCalc.calculateForecastQty(tenantId, candidate);
        if (forecast.forecastQty.lte(0)) {
          skipped.push({ partId: candidate.partId, reason: 'forecastQty <= 0 (無近期銷貨)' });
          continue;
        }
        const allocation = await this.arCalc.classifyByOemAftermarket(tenantId, forecast);

        // modelId=null fallback：純寫 1 Demand 給 candidate.partId
        if (!candidate.modelId) {
          const docNo = await this.allocDemandDocNo(tx, tenantId);
          const demand = await tx.nx02Demand.create({
            data: {
              tenantId,
              docNo,
              demandType: 'S',
              partId: candidate.partId,
              warehouseId: candidate.warehouseId,
              qty: forecast.forecastQty,
              status: 'O',
              remark: this.formatRemark(batchId, 'NO-MODEL', forecast, allocation),
              createdBy: userId,
              updatedBy: userId,
            },
            select: { id: true },
          });
          demandIds.push(demand.id);
          continue;
        }

        // OE 部分：找 fitLevel=1 OE part
        if (allocation.oemQty.gt(0)) {
          const oemReps = await this.partReplacement.findReplacementsByModel(
            tenantId,
            candidate.modelId,
            { includeFitLevels: [1] },
          );
          const oemPartId = oemReps[0]?.partId ?? candidate.partId;
          const docNo = await this.allocDemandDocNo(tx, tenantId);
          const demand = await tx.nx02Demand.create({
            data: {
              tenantId,
              docNo,
              demandType: 'S',
              partId: oemPartId,
              warehouseId: candidate.warehouseId,
              qty: allocation.oemQty,
              status: 'O',
              remark: this.formatRemark(batchId, 'OE', forecast, allocation),
              createdBy: userId,
              updatedBy: userId,
            },
            select: { id: true },
          });
          demandIds.push(demand.id);
        }

        // 副廠各品牌：Stage 4 breakdowns
        if (allocation.aftermarketQty.gt(0)) {
          const breakdowns = await this.arCalc.distributeAftermarketPool(tenantId, allocation);
          for (const b of breakdowns) {
            if (b.suggestedQty.lte(0)) continue;
            const docNo = await this.allocDemandDocNo(tx, tenantId);
            const demand = await tx.nx02Demand.create({
              data: {
                tenantId,
                docNo,
                demandType: 'S',
                partId: b.partId,
                warehouseId: candidate.warehouseId,
                qty: b.suggestedQty,
                status: 'O',
                remark: this.formatRemark(
                  batchId,
                  `AFT-${b.partBrandId ?? 'noBrand'}-share${b.shareRatio.toFixed(3)}`,
                  forecast,
                  allocation,
                ),
                createdBy: userId,
                updatedBy: userId,
              },
              select: { id: true },
            });
            demandIds.push(demand.id);
          }
        }
      }

      // 更新 setting.lastCalculatedAt（scheduler 判下次跑用）
      await tx.nx03PartStockSetting.updateMany({
        where: {
          tenantId,
          isActive: true,
          ...(warehouseId ? { warehouseId } : {}),
        },
        data: { lastCalculatedAt: new Date() },
      });
    });

    return {
      batchId,
      warehouseId: warehouseId ?? null,
      candidatesCount: candidates.length,
      demandsCreated: demandIds.length,
      demandIds,
      skipped,
    };
  }

  /**
   * inline alloc Demand docNo（範式 DR-YYYYMM-NNNNN、無倉碼、跟其他 NX02 helper 不同）。
   */
  private async allocDemandDocNo(
    tx: Prisma.TransactionClient,
    tenantId: string,
  ): Promise<string> {
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `DR-${yyyymm}-`;
    const last = await tx.nx02Demand.findFirst({
      where: { tenantId, docNo: { startsWith: prefix } },
      orderBy: { docNo: 'desc' },
      select: { docNo: true },
    });
    let next = 1;
    if (last?.docNo) {
      const parts = last.docNo.split('-');
      const tail = parts[parts.length - 1];
      const num = parseInt(tail, 10);
      if (!Number.isNaN(num)) next = num + 1;
    }
    return `${prefix}${String(next).padStart(5, '0')}`;
  }

  /**
   * 格式化 Demand.remark：batchId + 池類型 + forecast/allocation 摘要
   * 用於 UI 反查「此 Demand 從 AR 哪個 batch 來、依何規則算」
   */
  private formatRemark(
    batchId: string,
    pool: string,
    forecast: ForecastResult,
    allocation: AllocationResult,
  ): string {
    return [
      `[${batchId}]`,
      `pool=${pool}`,
      `forecast=${forecast.forecastQty.toString()}`,
      `avg=${forecast.avgDailyShipped.toFixed(4)}/day×${forecast.leadTimeDays}d`,
      `rule=${allocation.ruleSource}(OE:${allocation.oemRatio.toString()}/AFT:${allocation.aftermarketRatio.toString()})`,
    ]
      .join(' | ')
      .slice(0, 200);
  }
}

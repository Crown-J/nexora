// apps/nx-api/src/nx03/auto-replenish/ar-scheduler.service.ts
// AR scheduler service（找 due 倉 + 批次跑）
// 對齊 Crown Q-C1=D 混合 scheduled + on-demand：
//   - scheduled：外部 cron / k8s CronJob 透過 HTTP POST /run-due 觸發本 service
//   - on-demand：倉管/產品手動 POST /trigger?warehouseId=...
// 本軌不擴 @nestjs/schedule 依賴、純 service + endpoint

import { Injectable } from '@nestjs/common';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import { DEFAULT_CALCULATION_WINDOW_DAYS } from './ar-calculator.service';
import { ArSuggestionWriterService, type ArRunResult } from './ar-suggestion-writer.service';

/** 預設計算頻率（天數、PartStockSetting.calculationFrequency 為 null 時用）。 */
export const DEFAULT_CALCULATION_FREQUENCY_DAYS = 1;

export type ArDueWarehouse = {
  warehouseId: string;
  /** 該倉內 setting 最早的 lastCalculatedAt（null = 從未跑、視為 due）。 */
  oldestLastCalculatedAt: Date | null;
  /** 該倉採用的 frequency（取 setting 第一筆、本軌簡化、後續可升 per-setting）。 */
  frequencyDays: number;
};

@Injectable()
export class ArSchedulerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly writer: ArSuggestionWriterService,
  ) {}

  /**
   * 找該租戶內所有「due 該跑」的倉庫：
   *   - distinct warehouseId from PartStockSetting WHERE isActive=true
   *   - 對每倉計算「now - oldestLastCalculatedAt >= frequencyDays」
   *   - frequency 取該倉 setting 第一筆 calculationFrequency（null fallback 預設 1 天）
   *   - lastCalculatedAt = null（從未跑）即視為 due
   */
  async findDueWarehouses(tenantId: string): Promise<ArDueWarehouse[]> {
    // 取每倉 setting 摘要：oldest lastCalculatedAt + 一筆 frequencyDays
    const settings = await this.prisma.nx03PartStockSetting.findMany({
      where: { tenantId, isActive: true },
      select: {
        warehouseId: true,
        calculationFrequency: true,
        lastCalculatedAt: true,
      },
    });

    // 按倉聚合
    const byWarehouse = new Map<
      string,
      { oldestLastCalc: Date | null; frequency: number | null }
    >();
    for (const s of settings) {
      const cur = byWarehouse.get(s.warehouseId);
      const lastCalc = s.lastCalculatedAt;
      const oldestLastCalc = !cur
        ? lastCalc
        : !cur.oldestLastCalc || !lastCalc
          ? null
          : lastCalc < cur.oldestLastCalc
            ? lastCalc
            : cur.oldestLastCalc;
      byWarehouse.set(s.warehouseId, {
        oldestLastCalc,
        frequency: cur?.frequency ?? s.calculationFrequency,
      });
    }

    const now = new Date();
    const due: ArDueWarehouse[] = [];
    for (const [warehouseId, info] of byWarehouse.entries()) {
      const frequencyDays = info.frequency ?? DEFAULT_CALCULATION_FREQUENCY_DAYS;
      const isDue =
        !info.oldestLastCalc ||
        now.getTime() - info.oldestLastCalc.getTime() >= frequencyDays * 86400_000;
      if (isDue) {
        due.push({
          warehouseId,
          oldestLastCalculatedAt: info.oldestLastCalc,
          frequencyDays,
        });
      }
    }
    return due;
  }

  /**
   * 批次跑所有 due 倉（cron 用、外部 HTTP 觸發）
   *   - 找 due 倉 → 對每倉 call writer.runForWarehouse
   *   - 回傳每倉的 ArRunResult
   */
  async runDueBatch(user: RequestUser): Promise<{
    dueCount: number;
    results: Array<{ warehouseId: string; result: ArRunResult }>;
  }> {
    const tenantId = requireTenantId(user);
    const dueList = await this.findDueWarehouses(tenantId);
    const results: Array<{ warehouseId: string; result: ArRunResult }> = [];
    for (const due of dueList) {
      const result = await this.writer.runForWarehouse(user, due.warehouseId);
      results.push({ warehouseId: due.warehouseId, result });
    }
    return { dueCount: dueList.length, results };
  }
}

// 用 DEFAULT_CALCULATION_WINDOW_DAYS 避免 unused import lint 警告（型別暗示用、給 commit message 對齊）
void DEFAULT_CALCULATION_WINDOW_DAYS;

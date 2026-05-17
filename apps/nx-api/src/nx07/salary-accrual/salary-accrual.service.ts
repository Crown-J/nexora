// apps/nx-api/src/nx07/salary-accrual/salary-accrual.service.ts
// NX07 SalaryAccrual service（NX04 業績 → NX07 薪資加給 wire、業界改革 ⭐⭐⭐）
//
// 對齊：
//   - overview v0.1.0 §5（Crown Q2=a 業界改革候選 #2、業界中小汽配 ERP 第一個）
//   - audit-01 §6.4 業界改革候選
//   - 既有 schema FK 鏈：NX04 SO（createdBy）→ Nx07SalaryComponent.kpiTemplateId → Nx01KpiTemplate
//   - Hank Q-H2：service-level + 手動觸發 endpoint（不裝 cron、對齊 NX05 ArStatement / NX08 ETL 範式）
//   - Hank Q-H8：純 KPI bonus apply method（不含全套薪資自動結算）
//
// 業務語意：
//   - input: tenantId + yearMonth + userId（or all users）+ salaryRecordId（必須 DRAFT 狀態才能 apply）
//   - 演算法：
//     1. query NX04 SO byDate range + createdBy=userId → 月度業績總額
//     2. query 該 userId 的 Salary Component（calcMethod='K' + kpiTemplateId IS NOT NULL）
//     3. 對每個 K-component：bonus = performance × component.defaultValue%（簡化版）
//     4. 寫入 Nx07SalaryRecordItem（含 calcBasis 說明）
//   - 冪等：同 salaryRecordId 重複呼叫先 delete 既有 KPI-source items 再重算

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { applyMedalBonusToSalary } from '../../shared/nx10/nx10-apply-medal-bonus-to-salary';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

const KPI_CALC_BASIS_PREFIX = 'KPI-AUTO:';

@Injectable()
export class Nx07SalaryAccrualService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  /**
   * 月底手動觸發 KPI 業績加給套用。
   * 需提供 salaryRecordId（必須 DRAFT 狀態、避免改 CONFIRMED/PAID 薪資）。
   */
  async applyKpiBonus(
    user: RequestUser,
    input: { salaryRecordId: string },
  ) {
    const tenantId = requireTenantId(user);

    const salary = await this.prisma.nx07SalaryRecord.findFirst({
      where: { id: input.salaryRecordId.trim(), tenantId },
      select: { id: true, userId: true, yearMonth: true, status: true },
    });
    if (!salary) throw new NotFoundException('SalaryRecord not found');
    if (salary.status !== 'DRAFT') {
      throw new BadRequestException(
        `SalaryRecord must be DRAFT to apply KPI bonus, current=${salary.status}`,
      );
    }

    // parse yearMonth → date range
    const m = salary.yearMonth.match(/^(\d{4})-(\d{2})$/);
    if (!m) throw new BadRequestException('Invalid yearMonth format');
    const year = parseInt(m[1]!, 10);
    const month = parseInt(m[2]!, 10);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // 1. 月度業績總額（NX04 SO by createdBy = 業務員）
    const soAgg = await this.prisma.nx04So.aggregate({
      where: {
        tenantId,
        createdBy: salary.userId,
        soDate: { gte: startDate, lt: endDate },
        status: { not: 'CANCELLED' },
      },
      _sum: { totalAmount: true },
      _count: { _all: true },
    });
    const performanceAmount = soAgg._sum.totalAmount
      ? new PrismaNs.Decimal(soAgg._sum.totalAmount)
      : new PrismaNs.Decimal(0);

    // 2. 該 user 的 KPI-source 薪資 component（calcMethod='K' + kpiTemplateId IS NOT NULL + active）
    const kpiComponents = await this.prisma.nx07SalaryComponent.findMany({
      where: {
        tenantId,
        calcMethod: 'K',
        kpiTemplateId: { not: null },
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        compType: true,
        defaultValue: true,
        kpiTemplateId: true,
      },
    });

    // 3. 冪等：刪既有 KPI-AUTO items 再重算
    const existingKpiItems = await this.prisma.nx07SalaryRecordItem.findMany({
      where: {
        salaryRecordId: salary.id,
        calcBasis: { startsWith: KPI_CALC_BASIS_PREFIX },
      },
      select: { id: true },
    });
    if (existingKpiItems.length) {
      await this.prisma.nx07SalaryRecordItem.deleteMany({
        where: { id: { in: existingKpiItems.map((x) => x.id) } },
      });
    }

    // 4. 計算 + 寫入新 items
    const created: Array<{ componentCode: string; amount: string; calcBasis: string }> = [];
    for (const c of kpiComponents) {
      const ratePercent = c.defaultValue ? new PrismaNs.Decimal(c.defaultValue) : new PrismaNs.Decimal(0);
      if (ratePercent.lte(0)) continue;
      // bonus = performanceAmount × ratePercent / 100
      const bonus = performanceAmount.mul(ratePercent).div(100).toDecimalPlaces(2);
      const signedAmount = c.compType === 'D' ? bonus.neg() : bonus;
      if (signedAmount.eq(0)) continue;

      const basis = `${KPI_CALC_BASIS_PREFIX}performance=${performanceAmount.toString()} × ${ratePercent.toString()}% = ${bonus.toString()}`;
      await this.prisma.nx07SalaryRecordItem.create({
        data: {
          salaryRecordId: salary.id,
          componentId: c.id,
          amount: signedAmount,
          calcBasis: basis.slice(0, 200),
        },
      });
      created.push({ componentCode: c.code, amount: signedAmount.toString(), calcBasis: basis });
    }

    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX07',
      action: 'UPDATE',
      entityTable: 'nx07_salary_record',
      entityId: salary.id,
      summary: `KPI 業績加給套用：${created.length} 項、業績總額 ${performanceAmount.toString()}`,
      afterData: { applied: created, performanceAmount: performanceAmount.toString(), soCount: soAgg._count._all } as object,
    });

    // NX10 wire：醫章 tier 加碼倍率（try/catch 隔離、wire 失敗不阻擋 KPI 加給主流程）
    let medalBonus: Awaited<ReturnType<typeof applyMedalBonusToSalary>> | null = null;
    try {
      medalBonus = await this.prisma.$transaction(async (tx) =>
        applyMedalBonusToSalary(tx, {
          tenantId,
          salaryRecordId: salary.id,
          userId: salary.userId,
          actorUserId: user.sub,
        }),
      );
    } catch (err) {
      console.warn(
        `[NX10 wire] applyMedalBonusToSalary failed for salary ${salary.id}:`,
        err,
      );
    }

    return {
      ok: true,
      reform: '業界改革 #2 NX04 業績 → NX07 薪資加給 wire',
      salaryRecordId: salary.id,
      userId: salary.userId,
      yearMonth: salary.yearMonth,
      performanceAmount: performanceAmount.toString(),
      soCount: soAgg._count._all,
      appliedCount: created.length,
      applied: created,
      medalBonus,
    };
  }
}

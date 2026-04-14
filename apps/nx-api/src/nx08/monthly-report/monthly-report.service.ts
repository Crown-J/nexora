import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';

import { Nx08MonthlyReportListQueryDto, Nx08MonthlyReportSummaryQueryDto } from './nx08-monthly-report-list-query.dto';

function parseYearMonth(ym: string): { y: number; m: number } {
  const t = ym.trim();
  const parts = t.split('-');
  if (parts.length !== 2) throw new BadRequestException('yearMonth must be YYYY-MM');
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
    throw new BadRequestException('Invalid yearMonth');
  }
  return { y, m };
}

function d0() {
  return new PrismaNs.Decimal(0);
}

@Injectable()
export class Nx08MonthlyReportService {
  constructor(private readonly prisma: PrismaService) {}

  /** 唯讀彙整：依 nx01_kpi_record 聚合（非 nx08_monthly_report 表）。 */
  async list(user: RequestUser, q: Nx08MonthlyReportListQueryDto) {
    const tenantId = requireTenantId(user);
    const { y, m } = parseYearMonth(q.yearMonth);
    const where: Prisma.Nx01KpiRecordWhereInput = {
      tenantId,
      periodYear: y,
      periodValue: m,
    };
    if (q.userId?.trim()) where.userId = q.userId.trim();

    const records = await this.prisma.nx01KpiRecord.findMany({
      where,
      include: {
        user: { select: { id: true, userName: true, departmentId: true } },
        kpiTemplate: { select: { id: true, code: true, name: true, unit: true } },
      },
      orderBy: [{ userId: 'asc' }, { kpiTemplateId: 'asc' }],
    });

    type Agg = {
      userId: string;
      userName: string | null;
      departmentId: string | null;
      recordCount: number;
      sumActual: PrismaNs.Decimal;
      sumTarget: PrismaNs.Decimal;
      sumAchievementRate: PrismaNs.Decimal;
    };
    const byUser = new Map<string, Agg>();
    for (const r of records) {
      const uid = r.userId;
      let g = byUser.get(uid);
      if (!g) {
        g = {
          userId: uid,
          userName: r.user?.userName ?? null,
          departmentId: r.user?.departmentId ?? null,
          recordCount: 0,
          sumActual: d0(),
          sumTarget: d0(),
          sumAchievementRate: d0(),
        };
        byUser.set(uid, g);
      }
      g.recordCount += 1;
      g.sumActual = g.sumActual.add(r.actualValue);
      g.sumTarget = g.sumTarget.add(r.targetValue);
      g.sumAchievementRate = g.sumAchievementRate.add(r.achievementRate);
    }

    const rowsAll = [...byUser.values()].map((g) => ({
      ...g,
      avgAchievementRate:
        g.recordCount > 0 ? g.sumAchievementRate.div(g.recordCount).toDecimalPlaces(4) : d0(),
    }));

    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const total = rowsAll.length;
    const skip = (page - 1) * pageSize;
    const rows = rowsAll.slice(skip, skip + pageSize);

    return { yearMonth: q.yearMonth.trim(), page, pageSize, total, rows };
  }

  async summary(user: RequestUser, q: Nx08MonthlyReportSummaryQueryDto) {
    const tenantId = requireTenantId(user);
    const { y, m } = parseYearMonth(q.yearMonth);
    const records = await this.prisma.nx01KpiRecord.findMany({
      where: { tenantId, periodYear: y, periodValue: m },
      include: {
        user: { select: { id: true, userName: true, departmentId: true, hrDepartment: { select: { name: true } } } },
      },
    });

    let sumActual = d0();
    let sumAchievement = d0();
    for (const r of records) {
      sumActual = sumActual.add(r.actualValue);
      sumAchievement = sumAchievement.add(r.achievementRate);
    }
    const company = {
      recordCount: records.length,
      sumActualValue: sumActual,
      avgAchievementRate:
        records.length > 0 ? sumAchievement.div(records.length).toDecimalPlaces(4) : d0(),
    };

    type PA = { userId: string; userName: string | null; recordCount: number; sumActual: PrismaNs.Decimal; sumAch: PrismaNs.Decimal };
    const personalMap = new Map<string, PA>();
    type TA = {
      departmentId: string | null;
      departmentName: string | null;
      recordCount: number;
      sumActual: PrismaNs.Decimal;
      sumAch: PrismaNs.Decimal;
    };
    const teamKey = (deptId: string | null | undefined) => (deptId == null ? '__null__' : deptId);
    const teamMap = new Map<string, TA>();

    for (const r of records) {
      const uid = r.userId;
      if (!personalMap.has(uid)) {
        personalMap.set(uid, {
          userId: uid,
          userName: r.user?.userName ?? null,
          recordCount: 0,
          sumActual: d0(),
          sumAch: d0(),
        });
      }
      const p = personalMap.get(uid)!;
      p.recordCount += 1;
      p.sumActual = p.sumActual.add(r.actualValue);
      p.sumAch = p.sumAch.add(r.achievementRate);

      const dk = teamKey(r.user?.departmentId);
      if (!teamMap.has(dk)) {
        teamMap.set(dk, {
          departmentId: r.user?.departmentId ?? null,
          departmentName: r.user?.hrDepartment?.name ?? null,
          recordCount: 0,
          sumActual: d0(),
          sumAch: d0(),
        });
      }
      const t = teamMap.get(dk)!;
      t.recordCount += 1;
      t.sumActual = t.sumActual.add(r.actualValue);
      t.sumAch = t.sumAch.add(r.achievementRate);
    }

    const personal = [...personalMap.values()].map((p) => ({
      userId: p.userId,
      userName: p.userName,
      recordCount: p.recordCount,
      sumActualValue: p.sumActual,
      avgAchievementRate: p.recordCount > 0 ? p.sumAch.div(p.recordCount).toDecimalPlaces(4) : d0(),
    }));

    const team = [...teamMap.values()].map((t) => ({
      departmentId: t.departmentId,
      departmentName: t.departmentName,
      recordCount: t.recordCount,
      sumActualValue: t.sumActual,
      avgAchievementRate: t.recordCount > 0 ? t.sumAch.div(t.recordCount).toDecimalPlaces(4) : d0(),
    }));

    return {
      yearMonth: q.yearMonth.trim(),
      company,
      team,
      personal,
    };
  }
}

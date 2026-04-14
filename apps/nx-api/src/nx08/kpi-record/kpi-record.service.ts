import { Injectable } from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import { UpsertKpiRecordDto } from './kpi-record.dto';
import { Nx08KpiRecordListQueryDto } from './nx08-kpi-record-list-query.dto';

const HEAD = {
  id: true,
  tenantId: true,
  kpiTemplateId: true,
  kpiTargetId: true,
  userId: true,
  periodYear: true,
  periodValue: true,
  actualValue: true,
  targetValue: true,
  achievementRate: true,
  calcAt: true,
  createdAt: true,
} as const;

@Injectable()
export class Nx08KpiRecordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx08KpiRecordListQueryDto): Prisma.Nx01KpiRecordWhereInput {
    const parts: Prisma.Nx01KpiRecordWhereInput[] = [{ tenantId }];
    if (q.periodYear != null) parts.push({ periodYear: q.periodYear });
    if (q.userId?.trim()) parts.push({ userId: q.userId.trim() });
    if (q.kpiTemplateId?.trim()) parts.push({ kpiTemplateId: q.kpiTemplateId.trim() });
    if (q.search?.trim()) {
      const s = q.search.trim();
      parts.push({ OR: [{ id: { contains: s, mode: 'insensitive' } }] });
    }
    return parts.length === 1 ? parts[0]! : { AND: parts };
  }

  async list(user: RequestUser, q: Nx08KpiRecordListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01KpiRecord.count({ where }),
      this.prisma.nx01KpiRecord.findMany({
        where,
        orderBy: [{ periodYear: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
        select: HEAD,
      }),
    ]);
    return { page, pageSize, total, rows };
  }

  private async resolveTargetSnapshot(
    tenantId: string,
    dto: UpsertKpiRecordDto,
  ): Promise<{ targetValue: PrismaNs.Decimal; kpiTargetId: string | null }> {
    if (dto.kpiTargetId?.trim()) {
      const t = await this.prisma.nx01KpiTarget.findFirst({
        where: { id: dto.kpiTargetId.trim(), tenantId },
        select: { id: true, targetValue: true },
      });
      if (t) return { targetValue: t.targetValue, kpiTargetId: t.id };
    }
    const uid = dto.userId.trim();
    const u = await this.prisma.nx01User.findFirst({
      where: { id: uid, tenantId },
      select: { id: true, roleId: true },
    });
    const personal = await this.prisma.nx01KpiTarget.findFirst({
      where: {
        tenantId,
        kpiTemplateId: dto.kpiTemplateId.trim(),
        periodYear: dto.periodYear,
        periodValue: dto.periodValue ?? null,
        targetType: 'U',
        userId: uid,
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, targetValue: true },
    });
    if (personal) return { targetValue: personal.targetValue, kpiTargetId: personal.id };
    if (u?.roleId) {
      const roleT = await this.prisma.nx01KpiTarget.findFirst({
        where: {
          tenantId,
          kpiTemplateId: dto.kpiTemplateId.trim(),
          periodYear: dto.periodYear,
          periodValue: dto.periodValue ?? null,
          targetType: 'R',
          roleId: u.roleId,
        },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, targetValue: true },
      });
      if (roleT) return { targetValue: roleT.targetValue, kpiTargetId: roleT.id };
    }
    const snap = dto.targetValueSnapshot != null ? new PrismaNs.Decimal(dto.targetValueSnapshot) : new PrismaNs.Decimal(0);
    return { targetValue: snap, kpiTargetId: null };
  }

  async upsert(user: RequestUser, dto: UpsertKpiRecordDto) {
    const tenantId = requireTenantId(user);
    const { targetValue, kpiTargetId } = await this.resolveTargetSnapshot(tenantId, dto);
    const actual = new PrismaNs.Decimal(dto.actualValue);
    const ach =
      targetValue.gt(0) ? actual.div(targetValue).mul(100).toDecimalPlaces(4) : new PrismaNs.Decimal(0);

    const existing = await this.prisma.nx01KpiRecord.findFirst({
      where: {
        tenantId,
        userId: dto.userId.trim(),
        kpiTemplateId: dto.kpiTemplateId.trim(),
        periodYear: dto.periodYear,
        periodValue: dto.periodValue === undefined ? null : dto.periodValue,
      },
      select: HEAD,
    });

    if (existing) {
      const row = await this.prisma.nx01KpiRecord.update({
        where: { id: existing.id },
        data: {
          actualValue: actual,
          targetValue,
          kpiTargetId,
          achievementRate: ach,
          calcAt: new Date(),
        },
        select: HEAD,
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX08',
        action: 'UPDATE',
        entityTable: 'nx01_kpi_record',
        entityId: row.id,
        entityCode: row.id,
        summary: '更新 KPI 達成記錄',
        beforeData: existing as object,
        afterData: row as object,
      });
      return row;
    }

    const row = await this.prisma.nx01KpiRecord.create({
      data: {
        tenantId,
        kpiTemplateId: dto.kpiTemplateId.trim(),
        kpiTargetId,
        userId: dto.userId.trim(),
        periodYear: dto.periodYear,
        periodValue: dto.periodValue ?? null,
        actualValue: actual,
        targetValue,
        achievementRate: ach,
        calcAt: new Date(),
      },
      select: HEAD,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX08',
      action: 'CREATE',
      entityTable: 'nx01_kpi_record',
      entityId: row.id,
      entityCode: row.id,
      summary: '建立 KPI 達成記錄',
      afterData: row as object,
    });
    return row;
  }
}

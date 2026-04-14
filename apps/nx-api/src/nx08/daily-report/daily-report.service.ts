import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import { CreateDailyReportDto, PatchDailyReportDto } from './daily-report.dto';
import { Nx08DailyReportListQueryDto } from './nx08-daily-report-list-query.dto';

const HEAD = {
  id: true,
  tenantId: true,
  userId: true,
  reportDate: true,
  doneItems: true,
  kpiProgress: true,
  exceptionItems: true,
  tomorrowPlan: true,
  submittedAt: true,
  supervisorReply: true,
  repliedAt: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function parseReportDate(s: string): Date {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid reportDate');
  return startOfUtcDay(d);
}

@Injectable()
export class Nx08DailyReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx08DailyReportListQueryDto): Prisma.Nx08DailyReportWhereInput {
    const parts: Prisma.Nx08DailyReportWhereInput[] = [{ tenantId }];
    if (q.userId?.trim()) parts.push({ userId: q.userId.trim() });
    if (q.reportDateFrom?.trim()) {
      parts.push({ reportDate: { gte: parseReportDate(q.reportDateFrom) } });
    }
    if (q.reportDateTo?.trim()) {
      parts.push({ reportDate: { lte: parseReportDate(q.reportDateTo) } });
    }
    if (q.search?.trim()) {
      const s = q.search.trim();
      parts.push({
        OR: [
          { id: { contains: s, mode: 'insensitive' } },
          { userId: { contains: s, mode: 'insensitive' } },
          { doneItems: { contains: s, mode: 'insensitive' } },
        ],
      });
    }
    return parts.length === 1 ? parts[0]! : { AND: parts };
  }

  async list(user: RequestUser, q: Nx08DailyReportListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx08DailyReport.count({ where }),
      this.prisma.nx08DailyReport.findMany({
        where,
        orderBy: [{ reportDate: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
        select: HEAD,
      }),
    ]);
    return { page, pageSize, total, rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx08DailyReport.findFirst({ where: { id, tenantId }, select: HEAD });
    if (!row) throw new NotFoundException('Daily report not found');
    return row;
  }

  async create(user: RequestUser, dto: CreateDailyReportDto) {
    const tenantId = requireTenantId(user);
    const reportDate = parseReportDate(dto.reportDate);
    const uid = dto.userId.trim();
    const dup = await this.prisma.nx08DailyReport.findFirst({
      where: { tenantId, userId: uid, reportDate },
      select: { id: true },
    });
    if (dup) throw new BadRequestException('One daily report per user per day');
    const row = await this.prisma.nx08DailyReport.create({
      data: {
        tenantId,
        userId: uid,
        reportDate,
        doneItems: dto.doneItems?.trim() || null,
        kpiProgress: dto.kpiProgress?.trim() || null,
        exceptionItems: dto.exceptionItems?.trim() || null,
        tomorrowPlan: dto.tomorrowPlan?.trim() || null,
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: HEAD,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX08',
      action: 'CREATE',
      entityTable: 'nx08_daily_report',
      entityId: row.id,
      entityCode: row.id,
      summary: '建立日報',
      afterData: row as object,
    });
    return row;
  }

  async patch(user: RequestUser, id: string, dto: PatchDailyReportDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx08DailyReport.findFirst({ where: { id, tenantId }, select: HEAD });
    if (!existing) throw new NotFoundException('Daily report not found');
    const row = await this.prisma.nx08DailyReport.update({
      where: { id },
      data: {
        ...(dto.doneItems !== undefined ? { doneItems: dto.doneItems?.trim() || null } : {}),
        ...(dto.kpiProgress !== undefined ? { kpiProgress: dto.kpiProgress?.trim() || null } : {}),
        ...(dto.exceptionItems !== undefined ? { exceptionItems: dto.exceptionItems?.trim() || null } : {}),
        ...(dto.tomorrowPlan !== undefined ? { tomorrowPlan: dto.tomorrowPlan?.trim() || null } : {}),
        ...(dto.supervisorReply !== undefined
          ? {
              supervisorReply: dto.supervisorReply?.trim() || null,
              repliedAt: dto.supervisorReply?.trim() ? new Date() : existing.repliedAt,
            }
          : {}),
        updatedBy: user.sub,
      },
      select: HEAD,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX08',
      action: 'UPDATE',
      entityTable: 'nx08_daily_report',
      entityId: id,
      entityCode: id,
      summary: '修改日報',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  /**
   * 日報完成視同下班打卡：寫入 submitted_at，並於當日尚未 clock_out 時補 nx07_attendance。
   */
  async complete(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx08DailyReport.findFirst({ where: { id, tenantId }, select: HEAD });
    if (!existing) throw new NotFoundException('Daily report not found');
    if (existing.submittedAt) throw new BadRequestException('Daily report already completed');

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.nx08DailyReport.update({
        where: { id },
        data: { submittedAt: new Date(), updatedBy: user.sub },
        select: HEAD,
      });
      const att = await tx.nx07Attendance.findFirst({
        where: {
          tenantId,
          userId: existing.userId,
          workDate: existing.reportDate,
          voidedAt: null,
        },
        select: { id: true, clockOutAt: true },
      });
      if (att && !att.clockOutAt) {
        await tx.nx07Attendance.update({
          where: { id: att.id },
          data: {
            clockOutAt: new Date(),
            clockOutMethod: 'M',
            updatedBy: user.sub,
          },
        });
      }
      return updated;
    });

    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX08',
      action: 'UPDATE',
      entityTable: 'nx08_daily_report',
      entityId: id,
      entityCode: id,
      summary: '完成日報（含下班打卡同步）',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }
}

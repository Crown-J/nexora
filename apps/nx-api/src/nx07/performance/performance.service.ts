import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx07ListQueryDto } from '../../shared/nx07/nx07-list-query.dto';
import { assertPerformanceTransition, PerformanceStatus } from '../../shared/nx07/nx07-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import { CreatePerformanceDto, PatchPerformanceDto } from './performance.dto';

const HEAD = {
  id: true,
  tenantId: true,
  userId: true,
  title: true,
  periodLabel: true,
  status: true,
  score: true,
  comment: true,
  reviewerUserId: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

@Injectable()
export class Nx07PerformanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx07ListQueryDto): Prisma.Nx07PerformanceWhereInput {
    const parts: Prisma.Nx07PerformanceWhereInput[] = [{ tenantId }];
    if (q.status?.trim()) parts.push({ status: q.status.trim() });
    if (q.search?.trim()) {
      const s = q.search.trim();
      parts.push({
        OR: [
          { id: { contains: s, mode: 'insensitive' } },
          { title: { contains: s, mode: 'insensitive' } },
          { userId: { contains: s, mode: 'insensitive' } },
        ],
      });
    }
    return parts.length === 1 ? parts[0]! : { AND: parts };
  }

  async list(user: RequestUser, q: Nx07ListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx07Performance.count({ where }),
      this.prisma.nx07Performance.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: HEAD,
      }),
    ]);
    return { page, pageSize, total, rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx07Performance.findFirst({ where: { id, tenantId }, select: HEAD });
    if (!row) throw new NotFoundException('Performance record not found');
    return row;
  }

  async create(user: RequestUser, dto: CreatePerformanceDto) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx07Performance.create({
      data: {
        tenantId,
        userId: dto.userId.trim(),
        title: dto.title.trim(),
        periodLabel: dto.periodLabel.trim(),
        reviewerUserId: dto.reviewerUserId?.trim() || null,
        status: 'DRAFT',
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: HEAD,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX07',
      action: 'CREATE',
      entityTable: 'nx07_performance',
      entityId: row.id,
      entityCode: row.id,
      summary: '建立績效考核',
      afterData: row as object,
    });
    return row;
  }

  async patch(user: RequestUser, id: string, dto: PatchPerformanceDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx07Performance.findFirst({ where: { id, tenantId }, select: HEAD });
    if (!existing) throw new NotFoundException('Performance record not found');
    const next = dto.status.trim();
    assertPerformanceTransition(existing.status, next);
    const row = await this.prisma.nx07Performance.update({
      where: { id },
      data: { status: next, updatedBy: user.sub },
      select: HEAD,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX07',
      action: 'UPDATE',
      entityTable: 'nx07_performance',
      entityId: id,
      entityCode: id,
      summary: `績效狀態 ${existing.status} -> ${next}`,
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  async remove(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx07Performance.findFirst({ where: { id, tenantId }, select: HEAD });
    if (!existing) throw new NotFoundException('Performance record not found');
    assertPerformanceTransition(existing.status, PerformanceStatus.VOIDED);
    const row = await this.prisma.nx07Performance.update({
      where: { id },
      data: { status: PerformanceStatus.VOIDED, updatedBy: user.sub },
      select: HEAD,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX07',
      action: 'DELETE',
      entityTable: 'nx07_performance',
      entityId: id,
      entityCode: id,
      summary: '作廢績效考核',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }
}

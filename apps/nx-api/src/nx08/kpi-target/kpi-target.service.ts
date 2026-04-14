import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import { CreateKpiTargetDto, PatchKpiTargetDto } from './kpi-target.dto';
import { Nx08KpiTargetListQueryDto } from './nx08-kpi-list-query.dto';

const HEAD = {
  id: true,
  tenantId: true,
  kpiTemplateId: true,
  targetType: true,
  roleId: true,
  userId: true,
  periodYear: true,
  periodValue: true,
  targetValue: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

@Injectable()
export class Nx08KpiTargetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx08KpiTargetListQueryDto): Prisma.Nx01KpiTargetWhereInput {
    const parts: Prisma.Nx01KpiTargetWhereInput[] = [{ tenantId }];
    if (q.periodYear != null) parts.push({ periodYear: q.periodYear });
    if (q.userId?.trim()) parts.push({ userId: q.userId.trim() });
    if (q.kpiTemplateId?.trim()) parts.push({ kpiTemplateId: q.kpiTemplateId.trim() });
    if (q.search?.trim()) {
      const s = q.search.trim();
      parts.push({ OR: [{ id: { contains: s, mode: 'insensitive' } }] });
    }
    return parts.length === 1 ? parts[0]! : { AND: parts };
  }

  async list(user: RequestUser, q: Nx08KpiTargetListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx01KpiTarget.count({ where }),
      this.prisma.nx01KpiTarget.findMany({
        where,
        orderBy: [{ periodYear: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
        select: HEAD,
      }),
    ]);
    return { page, pageSize, total, rows };
  }

  async create(user: RequestUser, dto: CreateKpiTargetDto) {
    const tenantId = requireTenantId(user);
    const tt = dto.targetType.trim().toUpperCase();
    if (tt !== 'R' && tt !== 'U') throw new BadRequestException('targetType must be R or U');
    if (tt === 'R' && !dto.roleId?.trim()) throw new BadRequestException('roleId required when targetType=R');
    if (tt === 'U' && !dto.userId?.trim()) throw new BadRequestException('userId required when targetType=U');
    const row = await this.prisma.nx01KpiTarget.create({
      data: {
        tenantId,
        kpiTemplateId: dto.kpiTemplateId.trim(),
        targetType: tt,
        roleId: dto.roleId?.trim() || null,
        userId: dto.userId?.trim() || null,
        periodYear: dto.periodYear,
        periodValue: dto.periodValue ?? null,
        targetValue: new PrismaNs.Decimal(dto.targetValue ?? 0),
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
      entityTable: 'nx01_kpi_target',
      entityId: row.id,
      entityCode: row.id,
      summary: '建立 KPI 目標',
      afterData: row as object,
    });
    return row;
  }

  async patch(user: RequestUser, id: string, dto: PatchKpiTargetDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx01KpiTarget.findFirst({ where: { id, tenantId }, select: HEAD });
    if (!existing) throw new NotFoundException('KPI target not found');
    const data: Prisma.Nx01KpiTargetUncheckedUpdateInput = { updatedBy: user.sub };
    if (dto.targetValue !== undefined) data.targetValue = new PrismaNs.Decimal(dto.targetValue);
    if (dto.periodValue !== undefined) data.periodValue = dto.periodValue;
    if (dto.targetType !== undefined) {
      const tt = dto.targetType.trim().toUpperCase();
      if (tt !== 'R' && tt !== 'U') throw new BadRequestException('targetType must be R or U');
      data.targetType = tt;
    }
    if (dto.roleId !== undefined) data.roleId = dto.roleId?.trim() || null;
    if (dto.userId !== undefined) data.userId = dto.userId?.trim() || null;
    const row = await this.prisma.nx01KpiTarget.update({ where: { id }, data, select: HEAD });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX08',
      action: 'UPDATE',
      entityTable: 'nx01_kpi_target',
      entityId: id,
      entityCode: id,
      summary: '修改 KPI 目標',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }
}

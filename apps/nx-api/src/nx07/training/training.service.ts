import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx07ListQueryDto } from '../../shared/nx07/nx07-list-query.dto';
import { assertTrainingTransition, TrainingStatus } from '../../shared/nx07/nx07-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import { CreateTrainingDto, PatchTrainingDto } from './training.dto';

const HEAD = {
  id: true,
  tenantId: true,
  title: true,
  startAt: true,
  endAt: true,
  location: true,
  status: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

@Injectable()
export class Nx07TrainingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx07ListQueryDto): Prisma.Nx07TrainingWhereInput {
    const parts: Prisma.Nx07TrainingWhereInput[] = [{ tenantId }];
    if (q.status?.trim()) parts.push({ status: q.status.trim() });
    if (q.search?.trim()) {
      const s = q.search.trim();
      parts.push({
        OR: [
          { id: { contains: s, mode: 'insensitive' } },
          { title: { contains: s, mode: 'insensitive' } },
          { location: { contains: s, mode: 'insensitive' } },
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
      this.prisma.nx07Training.count({ where }),
      this.prisma.nx07Training.findMany({
        where,
        orderBy: { startAt: 'desc' },
        skip,
        take: pageSize,
        select: HEAD,
      }),
    ]);
    return { page, pageSize, total, rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx07Training.findFirst({ where: { id, tenantId }, select: HEAD });
    if (!row) throw new NotFoundException('Training record not found');
    return row;
  }

  async create(user: RequestUser, dto: CreateTrainingDto) {
    const tenantId = requireTenantId(user);
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (endAt.getTime() <= startAt.getTime()) {
      throw new BadRequestException('endAt must be after startAt');
    }
    const row = await this.prisma.nx07Training.create({
      data: {
        tenantId,
        title: dto.title.trim(),
        startAt,
        endAt,
        location: dto.location?.trim() || null,
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
      entityTable: 'nx07_training',
      entityId: row.id,
      entityCode: row.id,
      summary: '建立教育訓練',
      afterData: row as object,
    });
    return row;
  }

  async patch(user: RequestUser, id: string, dto: PatchTrainingDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx07Training.findFirst({ where: { id, tenantId }, select: HEAD });
    if (!existing) throw new NotFoundException('Training record not found');
    const next = dto.status.trim();
    assertTrainingTransition(existing.status, next);
    const row = await this.prisma.nx07Training.update({
      where: { id },
      data: { status: next, updatedBy: user.sub },
      select: HEAD,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX07',
      action: 'UPDATE',
      entityTable: 'nx07_training',
      entityId: id,
      entityCode: id,
      summary: `訓練狀態 ${existing.status} -> ${next}`,
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  async remove(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx07Training.findFirst({ where: { id, tenantId }, select: HEAD });
    if (!existing) throw new NotFoundException('Training record not found');
    assertTrainingTransition(existing.status, TrainingStatus.VOIDED);
    const row = await this.prisma.nx07Training.update({
      where: { id },
      data: { status: TrainingStatus.VOIDED, updatedBy: user.sub },
      select: HEAD,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX07',
      action: 'DELETE',
      entityTable: 'nx07_training',
      entityId: id,
      entityCode: id,
      summary: '作廢教育訓練',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }
}

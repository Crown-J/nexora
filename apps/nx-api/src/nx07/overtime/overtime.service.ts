import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';
import { Prisma as PrismaNs } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx07ListQueryDto } from '../../shared/nx07/nx07-list-query.dto';
import { assertLeaveOrOvertimeTransition } from '../../shared/nx07/nx07-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import { CreateOvertimeDto, PatchOvertimeDto } from './overtime.dto';

const HEAD = {
  id: true,
  tenantId: true,
  userId: true,
  workDate: true,
  startAt: true,
  endAt: true,
  totalHours: true,
  reason: true,
  otType: true,
  status: true,
  approvedBy: true,
  approvedAt: true,
  rejectReason: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

function hoursBetween(a: Date, b: Date): PrismaNs.Decimal {
  const ms = b.getTime() - a.getTime();
  if (ms <= 0) return new PrismaNs.Decimal(0);
  return new PrismaNs.Decimal(ms / 3600000).toDecimalPlaces(2);
}

@Injectable()
export class Nx07OvertimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx07ListQueryDto): Prisma.Nx07OvertimeRequestWhereInput {
    const parts: Prisma.Nx07OvertimeRequestWhereInput[] = [{ tenantId }];
    if (q.status?.trim()) parts.push({ status: q.status.trim() });
    if (q.search?.trim()) {
      const s = q.search.trim();
      parts.push({ OR: [{ id: { contains: s, mode: 'insensitive' } }, { reason: { contains: s, mode: 'insensitive' } }] });
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
      this.prisma.nx07OvertimeRequest.count({ where }),
      this.prisma.nx07OvertimeRequest.findMany({
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
    const row = await this.prisma.nx07OvertimeRequest.findFirst({ where: { id, tenantId }, select: HEAD });
    if (!row) throw new NotFoundException('Overtime request not found');
    return row;
  }

  async create(user: RequestUser, dto: CreateOvertimeDto) {
    const tenantId = requireTenantId(user);
    const workDate = new Date(dto.workDate);
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    const totalHours = hoursBetween(startAt, endAt);
    const row = await this.prisma.nx07OvertimeRequest.create({
      data: {
        tenantId,
        userId: dto.userId.trim(),
        workDate,
        startAt,
        endAt,
        totalHours,
        reason: dto.reason.trim(),
        otType: dto.otType?.trim()?.slice(0, 1) || 'W',
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
      entityTable: 'nx07_overtime_request',
      entityId: row.id,
      entityCode: row.id,
      summary: '建立加班申請',
      afterData: row as object,
    });
    return row;
  }

  async patch(user: RequestUser, id: string, dto: PatchOvertimeDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx07OvertimeRequest.findFirst({ where: { id, tenantId }, select: HEAD });
    if (!existing) throw new NotFoundException('Overtime request not found');
    const next = dto.status.trim();
    assertLeaveOrOvertimeTransition(existing.status, next);
    if (next === 'REJECTED' && !dto.rejectReason?.trim()) {
      throw new BadRequestException('rejectReason required when REJECTED');
    }
    const row = await this.prisma.nx07OvertimeRequest.update({
      where: { id },
      data: {
        status: next,
        ...(next === 'APPROVED' || next === 'REJECTED'
          ? { approvedBy: user.sub, approvedAt: new Date() }
          : {}),
        ...(next === 'REJECTED' ? { rejectReason: dto.rejectReason!.trim() } : {}),
        updatedBy: user.sub,
      },
      select: HEAD,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX07',
      action: 'UPDATE',
      entityTable: 'nx07_overtime_request',
      entityId: id,
      entityCode: id,
      summary: `加班狀態 ${existing.status} -> ${next}`,
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  async remove(user: RequestUser, id: string) {
    return this.patch(user, id, { status: 'CANCELLED' });
  }
}

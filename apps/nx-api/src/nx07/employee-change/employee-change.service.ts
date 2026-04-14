import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx07ListQueryDto } from '../../shared/nx07/nx07-list-query.dto';
import { assertEmployeeChangeTransition, EmployeeChangeStatus } from '../../shared/nx07/nx07-state-machine';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import { CreateEmployeeChangeDto, PatchEmployeeChangeDto } from './employee-change.dto';

const HEAD = {
  id: true,
  tenantId: true,
  targetUserId: true,
  changeType: true,
  newRoleId: true,
  newDepartmentId: true,
  effectiveDate: true,
  remark: true,
  status: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

const CHANGE_TYPES = new Set(['HIRE', 'TRANSFER', 'RESIGN']);

@Injectable()
export class Nx07EmployeeChangeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx07ListQueryDto): Prisma.Nx07EmployeeChangeWhereInput {
    const parts: Prisma.Nx07EmployeeChangeWhereInput[] = [{ tenantId }];
    if (q.status?.trim()) parts.push({ status: q.status.trim() });
    if (q.search?.trim()) {
      const s = q.search.trim();
      parts.push({
        OR: [
          { id: { contains: s, mode: 'insensitive' } },
          { targetUserId: { contains: s, mode: 'insensitive' } },
          { remark: { contains: s, mode: 'insensitive' } },
        ],
      });
    }
    return parts.length === 1 ? parts[0]! : { AND: parts };
  }

  private validateChangeType(ct: string): string {
    const u = ct.trim().toUpperCase();
    if (!CHANGE_TYPES.has(u)) {
      throw new BadRequestException(`changeType must be one of: ${[...CHANGE_TYPES].join(', ')}`);
    }
    return u;
  }

  private async applyApproved(
    tx: Prisma.TransactionClient,
    tenantId: string,
    actorUserId: string,
    row: {
      targetUserId: string;
      changeType: string;
      newRoleId: string | null;
      newDepartmentId: string | null;
    },
  ): Promise<void> {
    const ct = row.changeType.trim().toUpperCase();
    const target = await tx.nx01User.findFirst({
      where: { id: row.targetUserId, tenantId },
      select: { id: true },
    });
    if (!target) throw new BadRequestException('targetUserId not found in tenant');

    if (ct === 'RESIGN') {
      await tx.nx01User.update({
        where: { id: row.targetUserId },
        data: { isActive: false, updatedBy: actorUserId },
      });
      return;
    }

    if (ct === 'TRANSFER') {
      if (!row.newRoleId && !row.newDepartmentId) {
        throw new BadRequestException('TRANSFER requires newRoleId and/or newDepartmentId');
      }
      await tx.nx01User.update({
        where: { id: row.targetUserId },
        data: {
          ...(row.newRoleId ? { roleId: row.newRoleId } : {}),
          ...(row.newDepartmentId ? { departmentId: row.newDepartmentId } : {}),
          updatedBy: actorUserId,
        },
      });
      if (row.newRoleId) {
        const ur = await tx.nx01UserRole.findFirst({
          where: { userId: row.targetUserId, tenantId, isActive: true },
          orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }],
        });
        if (ur) {
          await tx.nx01UserRole.update({
            where: { id: ur.id },
            data: { roleId: row.newRoleId },
          });
        }
      }
      return;
    }

    if (ct === 'HIRE') {
      await tx.nx01User.update({
        where: { id: row.targetUserId },
        data: {
          isActive: true,
          ...(row.newRoleId ? { roleId: row.newRoleId } : {}),
          ...(row.newDepartmentId ? { departmentId: row.newDepartmentId } : {}),
          updatedBy: actorUserId,
        },
      });
      if (row.newRoleId) {
        const ur = await tx.nx01UserRole.findFirst({
          where: { userId: row.targetUserId, tenantId, isActive: true },
          orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }],
        });
        if (ur) {
          await tx.nx01UserRole.update({
            where: { id: ur.id },
            data: { roleId: row.newRoleId },
          });
        }
      }
    }
  }

  async list(user: RequestUser, q: Nx07ListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx07EmployeeChange.count({ where }),
      this.prisma.nx07EmployeeChange.findMany({
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
    const row = await this.prisma.nx07EmployeeChange.findFirst({ where: { id, tenantId }, select: HEAD });
    if (!row) throw new NotFoundException('Employee change not found');
    return row;
  }

  async create(user: RequestUser, dto: CreateEmployeeChangeDto) {
    const tenantId = requireTenantId(user);
    const changeType = this.validateChangeType(dto.changeType);
    const row = await this.prisma.nx07EmployeeChange.create({
      data: {
        tenantId,
        targetUserId: dto.targetUserId.trim(),
        changeType,
        newRoleId: dto.newRoleId?.trim() || null,
        newDepartmentId: dto.newDepartmentId?.trim() || null,
        effectiveDate: new Date(dto.effectiveDate),
        remark: dto.remark?.trim() || null,
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
      entityTable: 'nx07_employee_change',
      entityId: row.id,
      entityCode: row.id,
      summary: `建立員工異動 ${changeType}`,
      afterData: row as object,
    });
    return row;
  }

  async patch(user: RequestUser, id: string, dto: PatchEmployeeChangeDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx07EmployeeChange.findFirst({ where: { id, tenantId }, select: HEAD });
    if (!existing) throw new NotFoundException('Employee change not found');
    const next = dto.status.trim();
    assertEmployeeChangeTransition(existing.status, next);
    if (next === 'APPROVED') {
      const ct = existing.changeType.trim().toUpperCase();
      if (ct === 'TRANSFER' && !existing.newRoleId && !existing.newDepartmentId) {
        throw new BadRequestException('TRANSFER requires newRoleId and/or newDepartmentId before APPROVED');
      }
    }

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.nx07EmployeeChange.update({
        where: { id },
        data: { status: next, updatedBy: user.sub },
        select: HEAD,
      });
      if (next === 'APPROVED') {
        await this.applyApproved(tx, tenantId, user.sub, updated);
      }
      return updated;
    });

    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX07',
      action: 'UPDATE',
      entityTable: 'nx07_employee_change',
      entityId: id,
      entityCode: id,
      summary: `員工異動狀態 ${existing.status} -> ${next}`,
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  async remove(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx07EmployeeChange.findFirst({ where: { id, tenantId }, select: HEAD });
    if (!existing) throw new NotFoundException('Employee change not found');
    if (existing.status !== 'DRAFT' && existing.status !== 'PENDING') {
      throw new BadRequestException('Only DRAFT or PENDING can be voided');
    }
    assertEmployeeChangeTransition(existing.status, EmployeeChangeStatus.REJECTED);
    const row = await this.prisma.nx07EmployeeChange.update({
      where: { id },
      data: { status: EmployeeChangeStatus.REJECTED, updatedBy: user.sub },
      select: HEAD,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX07',
      action: 'DELETE',
      entityTable: 'nx07_employee_change',
      entityId: id,
      entityCode: id,
      summary: '作廢員工異動',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx07ListQueryDto } from '../../shared/nx07/nx07-list-query.dto';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import { AttendanceCheckDto, CreateAttendanceDto, PatchAttendanceDto } from './attendance.dto';

const SEL = {
  id: true,
  tenantId: true,
  userId: true,
  workDate: true,
  scheduleItemId: true,
  clockInAt: true,
  clockOutAt: true,
  clockInMethod: true,
  clockOutMethod: true,
  clockInIp: true,
  clockOutIp: true,
  status: true,
  voidedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function parseWorkDate(s: string): Date {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid workDate');
  return startOfUtcDay(d);
}

@Injectable()
export class Nx07AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private assertAdminOrSelf(user: RequestUser, targetUserId: string) {
    const roles = (user.roles ?? []).map((r) => String(r).trim().toUpperCase());
    if (roles.includes('ADMIN') || roles.includes('HR') || roles.includes('HR_ADMIN')) return;
    if (user.sub !== targetUserId) throw new ForbiddenException('Can only punch for self');
  }

  async list(user: RequestUser, q: Nx07ListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const parts: Prisma.Nx07AttendanceWhereInput[] = [{ tenantId, voidedAt: null }];
    if (q.status?.trim()) parts.push({ status: q.status.trim() });
    if (q.search?.trim()) {
      const s = q.search.trim();
      parts.push({ OR: [{ id: { contains: s, mode: 'insensitive' } }, { userId: { contains: s, mode: 'insensitive' } }] });
    }
    const where: Prisma.Nx07AttendanceWhereInput = parts.length === 1 ? parts[0]! : { AND: parts };
    const [total, rows] = await Promise.all([
      this.prisma.nx07Attendance.count({ where }),
      this.prisma.nx07Attendance.findMany({
        where,
        orderBy: [{ workDate: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
        select: SEL,
      }),
    ]);
    return { page, pageSize, total, rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx07Attendance.findFirst({ where: { id, tenantId }, select: SEL });
    if (!row) throw new NotFoundException('Attendance not found');
    return row;
  }

  async create(user: RequestUser, dto: CreateAttendanceDto) {
    const tenantId = requireTenantId(user);
    const workDate = parseWorkDate(dto.workDate);
    const uid = dto.userId.trim();
    const dup = await this.prisma.nx07Attendance.findFirst({
      where: { tenantId, userId: uid, workDate, voidedAt: null },
      select: { id: true },
    });
    if (dup) throw new BadRequestException('Attendance row already exists for this user and date');
    const row = await this.prisma.nx07Attendance.create({
      data: {
        tenantId,
        userId: uid,
        workDate,
        scheduleItemId: dto.scheduleItemId?.trim() || null,
        status: 'NORMAL',
        createdBy: user.sub,
        updatedBy: user.sub,
      },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX07',
      action: 'CREATE',
      entityTable: 'nx07_attendance',
      entityId: row.id,
      entityCode: row.id,
      summary: '建立出勤紀錄',
      afterData: row as object,
    });
    return row;
  }

  async checkin(user: RequestUser, dto: AttendanceCheckDto) {
    const tenantId = requireTenantId(user);
    const workDate = dto.workDate ? parseWorkDate(dto.workDate) : startOfUtcDay(new Date());
    const uid = dto.userId?.trim() || user.sub;
    this.assertAdminOrSelf(user, uid);
    return this.prisma.$transaction(async (tx) => {
      let row = await tx.nx07Attendance.findFirst({
        where: { tenantId, userId: uid, workDate, voidedAt: null },
        select: { ...SEL, clockInAt: true },
      });
      if (!row) {
        row = await tx.nx07Attendance.create({
          data: {
            tenantId,
            userId: uid,
            workDate,
            clockInAt: new Date(),
            clockInMethod: dto.method?.trim()?.slice(0, 1) || 'M',
            clockInIp: dto.ip?.trim() || null,
            status: 'NORMAL',
            createdBy: user.sub,
            updatedBy: user.sub,
          },
          select: SEL,
        });
      } else {
        if (row.clockInAt) throw new BadRequestException('Already checked in today');
        row = await tx.nx07Attendance.update({
          where: { id: row.id },
          data: {
            clockInAt: new Date(),
            clockInMethod: dto.method?.trim()?.slice(0, 1) || 'M',
            clockInIp: dto.ip?.trim() || null,
            updatedBy: user.sub,
          },
          select: SEL,
        });
      }
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX07',
        action: 'UPDATE',
        entityTable: 'nx07_attendance',
        entityId: row.id,
        entityCode: row.id,
        summary: '上班打卡',
        afterData: row as object,
      });
      return row;
    });
  }

  async checkout(user: RequestUser, dto: AttendanceCheckDto) {
    const tenantId = requireTenantId(user);
    const workDate = dto.workDate ? parseWorkDate(dto.workDate) : startOfUtcDay(new Date());
    const uid = dto.userId?.trim() || user.sub;
    this.assertAdminOrSelf(user, uid);
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.nx07Attendance.findFirst({
        where: { tenantId, userId: uid, workDate, voidedAt: null },
        select: { ...SEL, clockInAt: true, clockOutAt: true },
      });
      if (!row) throw new BadRequestException('No attendance row for this date; check in first');
      if (!row.clockInAt) throw new BadRequestException('Must check in before checkout');
      if (row.clockOutAt) throw new BadRequestException('Already checked out today');
      const updated = await tx.nx07Attendance.update({
        where: { id: row.id },
        data: {
          clockOutAt: new Date(),
          clockOutMethod: dto.method?.trim()?.slice(0, 1) || 'M',
          clockOutIp: dto.ip?.trim() || null,
          updatedBy: user.sub,
        },
        select: SEL,
      });
      await this.audit.write({
        tenantId,
        actorUserId: user.sub,
        moduleCode: 'NX07',
        action: 'UPDATE',
        entityTable: 'nx07_attendance',
        entityId: updated.id,
        entityCode: updated.id,
        summary: '下班打卡',
        afterData: updated as object,
      });
      return updated;
    });
  }

  async patch(user: RequestUser, id: string, dto: PatchAttendanceDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx07Attendance.findFirst({ where: { id, tenantId, voidedAt: null }, select: SEL });
    if (!existing) throw new NotFoundException('Attendance not found');
    const row = await this.prisma.nx07Attendance.update({
      where: { id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status.trim() } : {}),
        ...(dto.approveRemark !== undefined ? { approveRemark: dto.approveRemark?.trim() || null } : {}),
        updatedBy: user.sub,
      },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX07',
      action: 'UPDATE',
      entityTable: 'nx07_attendance',
      entityId: id,
      entityCode: id,
      summary: '修改出勤',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  async remove(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx07Attendance.findFirst({ where: { id, tenantId, voidedAt: null }, select: SEL });
    if (!existing) throw new NotFoundException('Attendance not found');
    const row = await this.prisma.nx07Attendance.update({
      where: { id },
      data: { voidedAt: new Date(), updatedBy: user.sub },
      select: SEL,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX07',
      action: 'DELETE',
      entityTable: 'nx07_attendance',
      entityId: id,
      entityCode: id,
      summary: '作廢出勤',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from 'db-core';

import type { RequestUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantId } from '../../shared/nx01/require-tenant';
import { Nx01AuditLogWriterService } from '../../shared/services/nx01-audit-log-writer.service';

import { CreateMeetingDto, PatchMeetingDto } from './meeting.dto';
import { Nx09MeetingListQueryDto } from './nx09-meeting-list-query.dto';

const MEETING_HEAD = {
  id: true,
  tenantId: true,
  title: true,
  meetingType: true,
  location: true,
  startAt: true,
  endAt: true,
  organizerId: true,
  status: true,
  remark: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

const MINUTES_SEL = {
  id: true,
  meetingId: true,
  content: true,
  decisions: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
} as const;

const ATT_SEL = {
  id: true,
  meetingId: true,
  userId: true,
  confirmStatus: true,
  actualAttended: true,
  absentReason: true,
  createdAt: true,
  updatedAt: true,
  updatedBy: true,
  user: { select: { id: true, userName: true } },
} as const;

const ACT_SEL = {
  id: true,
  meetingId: true,
  title: true,
  assigneeId: true,
  dueDate: true,
  status: true,
  completedAt: true,
  resultDesc: true,
  isOverdue: true,
  remark: true,
  createdAt: true,
  assignee: { select: { id: true, userName: true } },
} as const;

@Injectable()
export class Nx09MeetingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: Nx01AuditLogWriterService,
  ) {}

  private whereList(tenantId: string, q: Nx09MeetingListQueryDto): Prisma.Nx09MeetingWhereInput {
    const parts: Prisma.Nx09MeetingWhereInput[] = [{ tenantId }];
    const ex = (q.excludeCancelled ?? 'Y').trim().toUpperCase() !== 'N';
    if (ex) parts.push({ status: { not: 'X' } });
    if (q.status?.trim()) parts.push({ status: q.status.trim().slice(0, 1) });
    if (q.search?.trim()) {
      const s = q.search.trim();
      parts.push({
        OR: [
          { id: { contains: s, mode: 'insensitive' } },
          { title: { contains: s, mode: 'insensitive' } },
        ],
      });
    }
    return parts.length === 1 ? parts[0]! : { AND: parts };
  }

  async list(user: RequestUser, q: Nx09MeetingListQueryDto) {
    const tenantId = requireTenantId(user);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.whereList(tenantId, q);
    const [total, rows] = await Promise.all([
      this.prisma.nx09Meeting.count({ where }),
      this.prisma.nx09Meeting.findMany({
        where,
        orderBy: { startAt: 'desc' },
        skip,
        take: pageSize,
        select: MEETING_HEAD,
      }),
    ]);
    return { page, pageSize, total, rows };
  }

  async getById(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.nx09Meeting.findFirst({
      where: { id, tenantId },
      select: {
        ...MEETING_HEAD,
        rev_Nx09MeetingMinutes_meetingId: { select: MINUTES_SEL },
        rev_Nx09MeetingAttendee_meetingId: { select: ATT_SEL },
        rev_Nx09MeetingAction_meetingId: { orderBy: { dueDate: 'asc' }, select: ACT_SEL },
      },
    });
    if (!row) throw new NotFoundException('Meeting not found');
    return row;
  }

  async create(user: RequestUser, dto: CreateMeetingDto) {
    const tenantId = requireTenantId(user);
    const row = await this.prisma.$transaction(async (tx) => {
      const m = await tx.nx09Meeting.create({
        data: {
          tenantId,
          title: dto.title.trim(),
          meetingType: dto.meetingType.trim().slice(0, 2),
          location: dto.location?.trim() || null,
          startAt: new Date(dto.startAt),
          endAt: new Date(dto.endAt),
          organizerId: dto.organizerId.trim(),
          status: 'P',
          remark: dto.remark?.trim() || null,
          createdBy: user.sub,
          updatedBy: user.sub,
        },
        select: MEETING_HEAD,
      });
      if (dto.minutes) {
        await tx.nx09MeetingMinutes.create({
          data: {
            meetingId: m.id,
            content: dto.minutes.content?.trim() || null,
            decisions: dto.minutes.decisions?.trim() || null,
            createdBy: user.sub,
            updatedBy: user.sub,
          },
        });
      }
      for (const a of dto.attendees ?? []) {
        await tx.nx09MeetingAttendee.create({
          data: {
            meetingId: m.id,
            userId: a.userId.trim(),
            confirmStatus: a.confirmStatus?.trim()?.slice(0, 1) || 'P',
            updatedBy: user.sub,
          },
        });
      }
      for (const ac of dto.actions ?? []) {
        await tx.nx09MeetingAction.create({
          data: {
            tenantId,
            meetingId: m.id,
            title: ac.title.trim(),
            assigneeId: ac.assigneeId.trim(),
            dueDate: new Date(ac.dueDate),
            status: 'O',
            remark: ac.remark?.trim() || null,
            createdBy: user.sub,
            updatedBy: user.sub,
          },
        });
      }
      return tx.nx09Meeting.findFirstOrThrow({
        where: { id: m.id },
        select: {
          ...MEETING_HEAD,
          rev_Nx09MeetingMinutes_meetingId: { select: MINUTES_SEL },
          rev_Nx09MeetingAttendee_meetingId: { select: ATT_SEL },
          rev_Nx09MeetingAction_meetingId: { orderBy: { dueDate: 'asc' }, select: ACT_SEL },
        },
      });
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX09',
      action: 'CREATE',
      entityTable: 'nx09_meeting',
      entityId: row.id,
      entityCode: row.id,
      summary: '建立會議',
      afterData: row as object,
    });
    return row;
  }

  async patch(user: RequestUser, id: string, dto: PatchMeetingDto) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx09Meeting.findFirst({ where: { id, tenantId }, select: MEETING_HEAD });
    if (!existing) throw new NotFoundException('Meeting not found');
    if (existing.status === 'X') throw new BadRequestException('Meeting is cancelled');

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.nx09Meeting.update({
        where: { id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.meetingType !== undefined ? { meetingType: dto.meetingType.trim().slice(0, 2) } : {}),
          ...(dto.location !== undefined ? { location: dto.location?.trim() || null } : {}),
          ...(dto.startAt !== undefined ? { startAt: new Date(dto.startAt) } : {}),
          ...(dto.endAt !== undefined ? { endAt: new Date(dto.endAt) } : {}),
          ...(dto.status !== undefined ? { status: dto.status.trim().slice(0, 1) } : {}),
          ...(dto.remark !== undefined ? { remark: dto.remark?.trim() || null } : {}),
          updatedBy: user.sub,
        },
      });
      if (dto.minutes) {
        const prev = await tx.nx09MeetingMinutes.findFirst({ where: { meetingId: id } });
        const minData: Prisma.Nx09MeetingMinutesUpdateInput = { updatedBy: user.sub };
        if (dto.minutes.content !== undefined) minData.content = dto.minutes.content?.trim() || null;
        if (dto.minutes.decisions !== undefined) minData.decisions = dto.minutes.decisions?.trim() || null;
        if (prev) {
          await tx.nx09MeetingMinutes.update({ where: { id: prev.id }, data: minData });
        } else {
          await tx.nx09MeetingMinutes.create({
            data: {
              meetingId: id,
              content: dto.minutes.content?.trim() || null,
              decisions: dto.minutes.decisions?.trim() || null,
              createdBy: user.sub,
              updatedBy: user.sub,
            },
          });
        }
      }
      if (dto.attendees) {
        await tx.nx09MeetingAttendee.deleteMany({ where: { meetingId: id } });
        for (const a of dto.attendees) {
          await tx.nx09MeetingAttendee.create({
            data: {
              meetingId: id,
              userId: a.userId.trim(),
              confirmStatus: a.confirmStatus?.trim()?.slice(0, 1) || 'P',
              updatedBy: user.sub,
            },
          });
        }
      }
      return tx.nx09Meeting.findFirstOrThrow({
        where: { id },
        select: {
          ...MEETING_HEAD,
          rev_Nx09MeetingMinutes_meetingId: { select: MINUTES_SEL },
          rev_Nx09MeetingAttendee_meetingId: { select: ATT_SEL },
          rev_Nx09MeetingAction_meetingId: { orderBy: { dueDate: 'asc' }, select: ACT_SEL },
        },
      });
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX09',
      action: 'UPDATE',
      entityTable: 'nx09_meeting',
      entityId: id,
      entityCode: id,
      summary: '修改會議',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }

  async remove(user: RequestUser, id: string) {
    const tenantId = requireTenantId(user);
    const existing = await this.prisma.nx09Meeting.findFirst({ where: { id, tenantId }, select: MEETING_HEAD });
    if (!existing) throw new NotFoundException('Meeting not found');
    const row = await this.prisma.nx09Meeting.update({
      where: { id },
      data: { status: 'X', updatedBy: user.sub },
      select: MEETING_HEAD,
    });
    await this.audit.write({
      tenantId,
      actorUserId: user.sub,
      moduleCode: 'NX09',
      action: 'DELETE',
      entityTable: 'nx09_meeting',
      entityId: id,
      entityCode: id,
      summary: '軟刪會議（狀態 X）',
      beforeData: existing as object,
      afterData: row as object,
    });
    return row;
  }
}
